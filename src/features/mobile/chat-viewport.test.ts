import { describe, expect, it } from "vitest";
import { chatViewportGeometry } from "./chat-viewport";

describe("mobile chat virtual-keyboard viewport", () => {
  const base = {
    viewportHeight: 760,
    viewportTop: 0,
    layoutHeight: 760,
    restingHeight: 760,
    focused: false,
  };

  it("fills the viewport before typing and while the physical keyboard is used", () => {
    expect(chatViewportGeometry(base)).toEqual({ height: 760, top: 0, keyboardOpen: false });
    expect(chatViewportGeometry({ ...base, focused: true })).toEqual({
      height: 760,
      top: 0,
      keyboardOpen: false,
    });
  });

  it("keeps the composer above Chrome Android's resized visual viewport", () => {
    expect(chatViewportGeometry({ ...base, focused: true, viewportHeight: 410 })).toEqual({
      height: 410,
      top: 0,
      keyboardOpen: true,
    });
  });

  it("accounts for iOS Safari visual viewport scroll and keyboard animation", () => {
    expect(
      chatViewportGeometry({ ...base, focused: true, viewportHeight: 380, viewportTop: 52 }),
    ).toEqual({ height: 380, top: 52, keyboardOpen: true });
  });

  it("handles resizes-content browsers where layout and visual viewports shrink together", () => {
    expect(
      chatViewportGeometry({
        ...base,
        viewportHeight: 390,
        layoutHeight: 390,
        focused: true,
      }),
    ).toEqual({ height: 390, top: 0, keyboardOpen: true });
  });

  it("clips the shell when an Android WebView/PWA keyboard overlays the viewport", () => {
    expect(
      chatViewportGeometry({
        ...base,
        focused: true,
        keyboardTop: 430,
        keyboardHeight: 330,
      }),
    ).toEqual({ height: 430, top: 0, keyboardOpen: true });
  });

  it("does not hide page sections when the keyboard is closed or browser toolbar moves", () => {
    expect(
      chatViewportGeometry({
        ...base,
        viewportHeight: 700,
        viewportTop: 18,
      }),
    ).toEqual({ height: 700, top: 18, keyboardOpen: false });
  });

  it("never returns a negative shell height when keyboard covers nearly everything", () => {
    expect(
      chatViewportGeometry({
        ...base,
        focused: true,
        keyboardTop: 12,
        keyboardHeight: 748,
      }),
    ).toEqual({ height: 12, top: 0, keyboardOpen: true });
  });
});
