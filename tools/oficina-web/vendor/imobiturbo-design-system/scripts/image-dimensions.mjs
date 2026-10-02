// Reads headers only. Manifest metadata must agree with the actual file bytes.
export function imageDimensions(bytes) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    for (let offset = 12; offset + 8 <= bytes.length; ) {
      const type = bytes.toString("ascii", offset, offset + 4),
        length = bytes.readUInt32LE(offset + 4),
        start = offset + 8;
      if (type === "VP8X")
        return [
          1 + bytes.readUIntLE(start + 4, 3),
          1 + bytes.readUIntLE(start + 7, 3),
        ];
      if (type === "VP8L" && bytes[start] === 47) {
        const data = bytes.readUInt32LE(start + 1);
        return [(data & 16383) + 1, ((data >>> 14) & 16383) + 1];
      }
      if (
        type === "VP8 " &&
        bytes[start + 3] === 157 &&
        bytes[start + 4] === 1 &&
        bytes[start + 5] === 42
      )
        return [
          bytes.readUInt16LE(start + 6) & 16383,
          bytes.readUInt16LE(start + 8) & 16383,
        ];
      offset = start + length + (length % 2);
    }
  }
  if (bytes.readUInt16LE(0) === 0 && bytes.readUInt16LE(2) === 1)
    return [bytes[6] || 256, bytes[7] || 256];
  throw new Error("Formato/dimensões de imagem não suportados");
}
