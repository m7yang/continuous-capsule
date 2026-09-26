// Throwaway experiment. Capture public framework output, never infer native paths.
import SwiftUI
import Foundation

func commands(_ path: Path) -> [[String: Any]] {
    var result: [[String: Any]] = []
    path.forEach { element in
        switch element {
        case .move(let p): result.append(["type": "M", "points": [p.x, p.y]])
        case .line(let p): result.append(["type": "L", "points": [p.x, p.y]])
        case .quadCurve(let p, let c): result.append(["type": "Q", "points": [c.x, c.y, p.x, p.y]])
        case .curve(let p, let a, let b): result.append(["type": "C", "points": [a.x, a.y, b.x, b.y, p.x, p.y]])
        case .closeSubpath: result.append(["type": "Z", "points": [Double]()])
        }
    }
    return result
}
let sizes: [(String, Double, Double, Double, Double)] = [
    ("Compact Page Chip", 300, 26.25, 13.125, 16.5),
    ("Two-line Page Chip", 300, 42.5, 13.125, 16.5),
    ("Tall Page Chip", 300, 68, 13.125, 16.5),
    ("Compact Domain Card", 332, 83.25, 28.375, 35.5),
    ("Tall Domain Card", 332, 150, 28.375, 35.5),
    ("Square", 96, 96, 24, 30.17),
    ("Crowded corners", 64, 40, 18, 22.63),
    ("Wide control", 214, 30, 15, 18.86)
]
// Holdout cases are exported only after deriving the generator from the original
// 32 samples. Seeded dimensions and shoulder-boundary probes exercise both axes.
if CommandLine.arguments.contains("--validation") {
    var cases: [(String, Double, Double, Double)] = []
    let edge = Double(Float(1.528665))
    for radius in [0.125, 1.0, 5.375, 13.217, 31.375, 87.125] {
        for ratio in [1.0, 1.0000001, 1.05, 1.2, 4.0 / 3.0, edge - 0.000001, edge, edge + 0.000001, 1.7, 3.0] {
            for other in [1.0, 1.3, 4.0] {
                cases.append(("boundary", radius * 2 * ratio, radius * 2 * other, radius))
                cases.append(("transposed", radius * 2 * other, radius * 2 * ratio, radius))
            }
        }
    }
    var seed: UInt64 = 0x2c091726
    func random() -> Double {
        seed = seed &* 6364136223846793005 &+ 1442695040888963407
        return Double(seed >> 11) / 9007199254740992.0
    }
    for _ in 0..<192 {
        let width = 0.25 + random() * 4096
        let height = 0.25 + random() * 2160
        let radius = random() * min(width, height) * 0.85
        cases.append(("random", width, height, radius))
    }
    for radius in [0.0, 0.000001, 0.25, 12.125, 10000.0] {
        cases.append(("degenerate-radius", 37.75, 91.125, radius))
    }
    cases += [
        ("portrait", 37.75, 143.125, 17.3),
        ("near-square", 63.125, 62.875, 28.1),
        ("tiny-square", 8.125, 8.125, 4.0625),
        ("large-panel", 1024.25, 683.625, 239.1875)
    ]
    let validation: [[String: Any]] = cases.enumerated().map { index, sample in
        let (kind, width, height, radius) = sample
        return ["id": index, "kind": kind, "width": width, "height": height, "radius": radius,
                "continuous": commands(RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .path(in: CGRect(x: 0, y: 0, width: width, height: height)))]
    }
    let result: [String: Any] = ["source": "SwiftUI.RoundedRectangle(cornerRadius:style:.continuous).path(in:)",
        "os": ProcessInfo.processInfo.operatingSystemVersionString,
        "captured": ISO8601DateFormatter().string(from: Date()), "samples": validation]
    let json = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    print(String(data: json, encoding: .utf8)!)
    exit(0)
}
var samples: [[String: Any]] = []
for (name, w, h, base, css) in sizes {
    for factor in [0.5, 1.0, 1.5, 2.0] {
        let radius = base * factor
        let rect = CGRect(x: 0, y: 0, width: w, height: h)
        samples.append([
            "name": name, "width": w, "height": h, "radius": radius,
            "factor": factor, "cssRadius": css * factor,
            "continuous": commands(RoundedRectangle(cornerRadius: radius, style: .continuous).path(in: rect)),
            "capsule": commands(Capsule(style: .continuous).path(in: rect))
        ])
    }
}
let result: [String: Any] = [
    "source": "SwiftUI RoundedRectangle and Capsule, style: .continuous, path(in:)",
    "os": ProcessInfo.processInfo.operatingSystemVersionString,
    "captured": ISO8601DateFormatter().string(from: Date()),
    "samples": samples
]
let json = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
print("window.NATIVE = " + String(data: json, encoding: .utf8)! + ";")
