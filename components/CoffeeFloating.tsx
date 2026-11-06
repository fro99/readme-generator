'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// 공식 후원 페이지 주소(https)를 여기 한 곳에만 넣으세요. 비어 있으면 "준비 중"으로 안내됩니다.
const DONATE_URL = '';

function getSafeDonateUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function CoffeeFloating() {
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const donateUrl = getSafeDonateUrl(DONATE_URL);

  const close = useCallback(() => {
    setOpen(false);
    fabRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className="coffee-fab"
        aria-label="개발자에게 커피 한 잔 후원하기"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coffee.png" alt="" width={60} height={60} />
        <span className="coffee-tip" aria-hidden="true">개발자에게 커피 한 잔 ☕</span>
      </button>

      {open && (
        <div className="coffee-backdrop" onClick={close}>
          <div
            ref={dialogRef}
            className="coffee-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coffee-title"
            aria-describedby="coffee-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="coffee-x" aria-label="닫기" onClick={close}>
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="coffee-logo" src="/coffee.png" alt="" width={88} height={88} />
            <h2 id="coffee-title">개발자에게 커피 한 잔 후원하시겠습니까?</h2>
            <p id="coffee-desc">보내주신 응원은 서비스를 개선하고 운영하는 데 큰 힘이 됩니다.</p>
            {!donateUrl && (
              <p className="coffee-notice" role="status">
                후원 기능을 준비 중입니다.
              </p>
            )}
            <div className="coffee-actions">
              <button type="button" className="coffee-btn" onClick={close}>
                다음에 할게요
              </button>
              {donateUrl ? (
                <a
                  className="coffee-btn coffee-btn-primary"
                  href={donateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-autofocus
                  onClick={() => setOpen(false)}
                >
                  후원하러 가기 ☕
                </a>
              ) : (
                <button type="button" className="coffee-btn coffee-btn-primary" aria-disabled="true" data-autofocus>
                  후원하러 가기 ☕
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
