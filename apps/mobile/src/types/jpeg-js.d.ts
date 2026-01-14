/**
 * Type declarations for jpeg-js package
 */
declare module 'jpeg-js' {
  export interface RawImageData {
    width: number;
    height: number;
    data: Uint8Array | Buffer;
  }

  export interface DecodeOptions {
    useTArray?: boolean;
    colorTransform?: boolean;
    formatAsRGBA?: boolean;
    tolerantDecoding?: boolean;
    maxResolutionInMP?: number;
    maxMemoryUsageInMB?: number;
  }

  export interface EncodeOptions {
    quality?: number;
  }

  export function decode(
    jpegData: ArrayBuffer | Buffer | Uint8Array,
    options?: DecodeOptions
  ): RawImageData;

  export function encode(
    imgData: RawImageData,
    quality?: number
  ): { data: Uint8Array; width: number; height: number };
}
