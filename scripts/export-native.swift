// Run from this package: swift scripts/export-native.swift > /tmp/apple-capsules-candidate.json
// Uses public SwiftUI APIs. Captures the installed OS implementation, not a stable
// promise about other OS releases or every system toolbar/control's silhouette.
import SwiftUI
import Foundation

func commands(_ path: Path) -> [[String: Any]] {
    var result: [[String: Any]] = []
    path.forEach { element in
        switch element {
        case .move(let p): result.append(["type": "M", "points": [p.x, p.y]])
        case .line(let p): result.append(["type": "L", "points": [p.x, p.y]])
        case .quadCurve(let p, let c): result.append(["type": "Q", "points": [c.x, c.y, p.x, p.y]])
        case .curve(let p, let c1, let c2): result.append(["type": "C", "points": [c1.x, c1.y, c2.x, c2.y, p.x, p.y]])
        case .closeSubpath: result.append(["type": "Z", "points": [Double]()])
        }
    }
    return result
}

// --compact captures the reported borderless badge, its 1px border inset, and
// nearby heights/aspect ratios independently of the runtime's source profile.
let sizes: [(Double, Double)] = CommandLine.arguments.contains("--compact")
    ? [(60.703125,22), (59.703125,21), (48,16), (48,20), (35.2,22), (36,22), (44,22), (61,22), (60.703125,18), (60.703125,24)]
    : [(214,30), (213,29), (211,27), (76,38), (75,37), (73,35), (160,48), (300,24), (234,40)]
let samples: [[String: Any]] = sizes.map { width, height in
    let rect = CGRect(x: 0, y: 0, width: width, height: height)
    return [
        "width": width, "height": height,
        "continuous": commands(Capsule(style: .continuous).path(in: rect)),
        "circular": commands(Capsule(style: .circular).path(in: rect)),
        "roundedRectangle": commands(RoundedRectangle(cornerRadius: height / 2, style: .continuous).path(in: rect))
    ]
}
let data: [String: Any] = [
    "source": "SwiftUI.Capsule(style: .continuous).path(in:)",
    "os": ProcessInfo.processInfo.operatingSystemVersionString,
    "samples": samples
]
let json = try JSONSerialization.data(withJSONObject: data, options: [.prettyPrinted, .sortedKeys])
print(String(data: json, encoding: .utf8)!)
