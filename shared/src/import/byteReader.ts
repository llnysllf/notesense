// A cursor that cannot read past its own end.
//
// Every read from an imported file goes through here. A parser that indexes a
// buffer directly will happily read `undefined` off the end and interpret it as
// data; this throws instead, so a truncated or lying file produces one clean
// failure rather than plausible-looking nonsense.
//
// Split out from the MIDI parser because it is a general concern: any format
// added later — MusicXML's container, say — needs exactly this and should not
// re-implement it.

export class ByteReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get position(): number {
    return this.offset;
  }

  get remaining(): number {
    return this.bytes.length - this.offset;
  }

  seek(offset: number): void {
    this.offset = Math.min(Math.max(0, offset), this.bytes.length);
  }

  byte(): number {
    if (this.offset >= this.bytes.length) throw new RangeError("unexpected end of file");
    return this.bytes[this.offset++] as number;
  }

  uint16(): number {
    return (this.byte() << 8) | this.byte();
  }

  uint32(): number {
    return ((this.byte() << 24) | (this.byte() << 16) | (this.byte() << 8) | this.byte()) >>> 0;
  }

  skip(count: number): void {
    if (count < 0 || count > this.remaining) throw new RangeError("length runs past the end of the file");
    this.offset += count;
  }

  // Printable ASCII only: a name from a file is a label, not a channel for
  // arbitrary bytes to reach the interface.
  text(count: number, maxLength = 60): string {
    if (count < 0 || count > this.remaining) throw new RangeError("length runs past the end of the file");
    let value = "";
    for (let index = 0; index < count; index += 1) {
      const code = this.bytes[this.offset + index] as number;
      value += code >= 32 && code < 127 ? String.fromCharCode(code) : "";
    }
    this.offset += count;
    return value.slice(0, maxLength);
  }

  // MIDI's variable-length quantity. Capped at four bytes, which is the
  // format's own limit — without the cap a run of continuation bytes loops
  // until the file ends.
  variable(): number {
    let value = 0;
    for (let index = 0; index < 4; index += 1) {
      const byte = this.byte();
      value = (value << 7) | (byte & 0x7f);
      if ((byte & 0x80) === 0) return value >>> 0;
    }
    throw new RangeError("malformed variable-length value");
  }
}
