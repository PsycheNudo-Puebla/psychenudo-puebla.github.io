// Type declarations para qrcodejs (carga global vía qrcode.min.js)
interface QRCodeConstructor {
  new (element: HTMLElement | string, options: {
    text: string;
    width?: number;
    height?: number;
    colorDark?: string;
    colorLight?: string;
    correctLevel?: number;
  }): QRCodeInstance;
  (element: HTMLElement | string, options: {
    text: string;
    width?: number;
    height?: number;
    colorDark?: string;
    colorLight?: string;
    correctLevel?: number;
  }): QRCodeInstance;
  CorrectLevel: {
    H: number;
    L: number;
    M: number;
    Q: number;
  };
}

interface QRCodeInstance {
  clear(): void;
  makeCode(text: string): void;
}

declare global {
  interface Window {
    QRCode: QRCodeConstructor;
  }
}

export {};
