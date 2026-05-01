import AppKit
import ImageIO
import UniformTypeIdentifiers

let outputPath = CommandLine.arguments.dropFirst().first ?? "docs/assets/saynext-demo.gif"
let outputURL = URL(fileURLWithPath: outputPath)
let frameSize = CGSize(width: 960, height: 540)
let paletteRect = CGRect(x: 72, y: 76, width: 520, height: 388)
let chatRect = CGRect(x: 620, y: 96, width: 268, height: 348)

struct DemoFrame {
  let step: Int
  let title: String
  let subtitle: String
  let selectedPrompt: Int
  let copied: Bool
  let pasted: Bool
}

let frames: [DemoFrame] = [
  DemoFrame(step: 0, title: "Open SayNext", subtitle: "Press Cmd/Ctrl + Shift + H", selectedPrompt: 0, copied: false, pasted: false),
  DemoFrame(step: 1, title: "Pick a rescue prompt", subtitle: "Choose the next thing to ask AI", selectedPrompt: 0, copied: false, pasted: false),
  DemoFrame(step: 2, title: "Click once to copy", subtitle: "The prompt goes to your clipboard", selectedPrompt: 0, copied: true, pasted: false),
  DemoFrame(step: 3, title: "Paste into AI chat", subtitle: "Works with ChatGPT, Claude, Gemini, or Codex", selectedPrompt: 0, copied: true, pasted: true),
  DemoFrame(step: 4, title: "Keep the conversation moving", subtitle: "No prompt engineering required", selectedPrompt: 1, copied: false, pasted: true),
  DemoFrame(step: 5, title: "SayNext", subtitle: "Find the next better question", selectedPrompt: 2, copied: false, pasted: true)
]

let prompts = [
  ("I want to...", "Please help me organize my need before I ask."),
  ("Explain simply", "Use plain language and make it easy to understand."),
  ("Plan next steps", "Create the best execution plan and ask me key choices.")
]

func color(_ hex: UInt32, alpha: CGFloat = 1) -> NSColor {
  NSColor(
    calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: alpha
  )
}

func drawRounded(_ rect: CGRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = lineWidth
    path.stroke()
  }
}

func drawText(_ text: String, in rect: CGRect, size: CGFloat, weight: NSFont.Weight = .regular, color textColor: NSColor, align: NSTextAlignment = .left) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = align
  paragraph.lineBreakMode = .byWordWrapping
  let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: size, weight: weight),
    .foregroundColor: textColor,
    .paragraphStyle: paragraph
  ]
  (text as NSString).draw(in: rect, withAttributes: attributes)
}

func drawPalette(frame: DemoFrame) {
  drawRounded(paletteRect, radius: 18, fill: color(0x171b22), stroke: color(0x354154), lineWidth: 1.4)
  drawText("SAYNEXT", in: CGRect(x: 102, y: 410, width: 120, height: 22), size: 13, weight: .bold, color: color(0x8994a7))
  drawText("AI Next Prompt", in: CGRect(x: 102, y: 376, width: 260, height: 34), size: 27, weight: .bold, color: .white)

  let chips = ["Start", "Explain", "Plan", "Execute", "Check"]
  for (index, chip) in chips.enumerated() {
    let x = 102 + CGFloat(index) * 80
    let active = index == min(frame.selectedPrompt, 2)
    drawRounded(CGRect(x: x, y: 334, width: 68, height: 28), radius: 8, fill: active ? color(0x183b65) : color(0x1d222b), stroke: active ? color(0x2f80ed) : color(0x343b46))
    drawText(chip, in: CGRect(x: x, y: 341, width: 68, height: 14), size: 11, weight: .semibold, color: active ? color(0xa9d3ff) : color(0x8a94a6), align: .center)
  }

  for (index, prompt) in prompts.enumerated() {
    let y = 260 - CGFloat(index) * 72
    let selected = index == frame.selectedPrompt
    drawRounded(CGRect(x: 96, y: y, width: 468, height: 58), radius: 10, fill: selected ? color(0x202c3a) : color(0x171b22), stroke: selected ? color(0x34557c) : color(0x171b22))
    drawText("☆", in: CGRect(x: 114, y: y + 16, width: 24, height: 24), size: 24, color: color(0xa4afc1))
    drawText(prompt.0, in: CGRect(x: 150, y: y + 31, width: 250, height: 20), size: 15, weight: .bold, color: .white)
    drawText(prompt.1, in: CGRect(x: 150, y: y + 12, width: 330, height: 20), size: 12, color: color(0xd8dde7))
    drawText(frame.copied && selected ? "✓" : "⧉", in: CGRect(x: 524, y: y + 19, width: 24, height: 24), size: 20, weight: .semibold, color: frame.copied && selected ? color(0x6ee7a8) : color(0x8a94a6), align: .center)
  }
}

func drawChat(frame: DemoFrame) {
  drawRounded(chatRect, radius: 18, fill: color(0xffffff), stroke: color(0xd6dde8), lineWidth: 1.2)
  drawText("AI chat", in: CGRect(x: 646, y: 404, width: 140, height: 24), size: 17, weight: .bold, color: color(0x172033))
  drawRounded(CGRect(x: 646, y: 132, width: 216, height: 52), radius: 12, fill: color(0xf3f6fa), stroke: color(0xd8e1eb))
  drawText(frame.pasted ? prompts[0].1 : "Paste the copied prompt here...", in: CGRect(x: 662, y: 147, width: 184, height: 28), size: 12, color: frame.pasted ? color(0x172033) : color(0x7c899a))

  if frame.pasted {
    drawRounded(CGRect(x: 646, y: 226, width: 216, height: 76), radius: 12, fill: color(0xeaf3ff), stroke: color(0xc7dcff))
    drawText("AI can now ask better follow-up questions and continue.", in: CGRect(x: 662, y: 244, width: 184, height: 42), size: 12, color: color(0x23517f))
  }
}

func drawFrame(_ frame: DemoFrame) -> CGImage {
  let image = NSImage(size: frameSize)
  image.lockFocus()
  color(0xf4f7fb).setFill()
  NSRect(origin: .zero, size: frameSize).fill()

  drawRounded(CGRect(x: 38, y: 38, width: 884, height: 464), radius: 24, fill: color(0xffffff), stroke: color(0xdde5ef))
  drawText(frame.title, in: CGRect(x: 72, y: 476, width: 470, height: 30), size: 22, weight: .bold, color: color(0x172033))
  drawText(frame.subtitle, in: CGRect(x: 620, y: 478, width: 280, height: 26), size: 13, weight: .semibold, color: color(0x607086), align: .right)
  drawPalette(frame: frame)
  drawChat(frame: frame)

  image.unlockFocus()
  var rect = CGRect(origin: .zero, size: frameSize)
  return image.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
}

let data = NSMutableData()
guard let destination = CGImageDestinationCreateWithData(data, UTType.gif.identifier as CFString, frames.count, nil) else {
  fatalError("Could not create GIF destination")
}

CGImageDestinationSetProperties(destination, [
  kCGImagePropertyGIFDictionary: [
    kCGImagePropertyGIFLoopCount: 0
  ]
] as CFDictionary)

for frame in frames {
  CGImageDestinationAddImage(destination, drawFrame(frame), [
    kCGImagePropertyGIFDictionary: [
      kCGImagePropertyGIFDelayTime: 1.05
    ]
  ] as CFDictionary)
}

guard CGImageDestinationFinalize(destination) else {
  fatalError("Could not finalize GIF")
}

try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
try data.write(to: outputURL)
print("Wrote \(outputPath)")
