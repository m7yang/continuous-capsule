// Native render diagnostic; see docs/research.md for reproduction.
import SwiftUI
import AppKit
struct Command: Decodable { let type: String; let points: [Double] }
struct Sample: Decodable { let id: String; let role: String; let width: Double; let height: Double; let baseline: [Command]; let fitted: [Command] }
let directory = URL(fileURLWithPath: CommandLine.arguments[1])
func boundary(_ image: NSBitmapImageRep, scale: Double) -> [CGPoint] {
    precondition(image.bitsPerSample == 8)
    func value(_ x: Int, _ y: Int) -> Double { Double(image.bitmapData![y * image.bytesPerRow + x * image.samplesPerPixel]) }
    var points = [CGPoint]()
    // Interpolate the 50% black/white edge; sample both axes near flat shoulders.
    for y in 0..<image.pixelsHigh / 2 {
        for x in 0..<image.pixelsWide / 2 where value(x, y) <= 127.5 {
            let edge = x == 0 ? 0 : Double(x) - 0.5 + (value(x - 1, y) - 127.5) / (value(x - 1, y) - value(x, y))
            points.append(CGPoint(x: edge / scale, y: (Double(y) + 0.5) / scale)); break
        }
    }
    for x in 0..<image.pixelsWide / 2 {
        for y in 0..<image.pixelsHigh / 2 where value(x, y) <= 127.5 {
            let edge = y == 0 ? 0 : Double(y) - 0.5 + (value(x, y - 1) - 127.5) / (value(x, y - 1) - value(x, y))
            points.append(CGPoint(x: (Double(x) + 0.5) / scale, y: edge / scale)); break
        }
    }
    return points
}
func supportDifference(_ a: [CGPoint], _ b: [CGPoint]) -> Double {
    (0...720).map { index in
        let angle = Double(index) * .pi / 1440, u = cos(angle), v = sin(angle)
        return abs(a.map { $0.x * u + $0.y * v }.min()! - b.map { $0.x * u + $0.y * v }.min()!)
    }.max()!
}
func path(_ commands: [Command]) -> Path {
    var result=Path()
    for command in commands {
        let p=command.points
        switch command.type {
        case "M": result.move(to:CGPoint(x:p[0],y:p[1]))
        case "L": result.addLine(to:CGPoint(x:p[0],y:p[1]))
        case "C": result.addCurve(to:CGPoint(x:p[4],y:p[5]),control1:CGPoint(x:p[0],y:p[1]),control2:CGPoint(x:p[2],y:p[3]))
        case "Z": result.closeSubpath()
        default: fatalError("Unexpected command")
        }
    }
    return result
}
@MainActor func run() throws {
    let cases=try JSONDecoder().decode([Sample].self,from:Data(contentsOf:directory.appendingPathComponent("capsule-fit-cases.json")))
    var results=[[String:Any]]()
    for c in cases {
        for scale in [2.0,16.0] {
            func bitmap<V:View>(_ view:V)->NSBitmapImageRep {
                let renderer=ImageRenderer(content:view.frame(width:c.width,height:c.height).background(.white))
                renderer.scale=scale
                return NSBitmapImageRep(cgImage:renderer.cgImage!)
            }
            let native=bitmap(Capsule(style:.continuous).fill(.black))
            let baseline=bitmap(path(c.baseline).fill(.black)),fitted=bitmap(path(c.fitted).fill(.black))
            let target=boundary(native,scale:scale)
            let before=supportDifference(target,boundary(baseline,scale:scale)),after=supportDifference(target,boundary(fitted,scale:scale))
            for (name,image) in [("native",native),("baseline",baseline),("fitted",fitted)] {
                try image.representation(using:.png,properties:[:])!.write(to:directory.appendingPathComponent("fit-\(c.id)-\(Int(scale))x-\(name).png"))
            }
            results.append(["id":c.id,"role":c.role,"width":c.width,"height":c.height,"scale":scale,"before":before,"after":after])
            print("\(c.role) \(c.width)×\(c.height) \(scale)×: \(before) → \(after)")
        }
    }
    let report:[String:Any]=["os":ProcessInfo.processInfo.operatingSystemVersionString,"captured":ISO8601DateFormatter().string(from:Date()),"results":results]
    let data=try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys])
    try data.write(to:directory.appendingPathComponent("capsule-fit-report.json"))
    try ("window.CAPSULE_FIT_REPORT = "+String(data:data,encoding:.utf8)!+";\n").write(to:directory.appendingPathComponent("capsule-fit-report.js"),atomically:true,encoding:.utf8)
}
try MainActor.assumeIsolated { try run() }
