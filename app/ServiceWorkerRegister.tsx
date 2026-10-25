"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/ems-helper/sw.js", {
          scope: "/ems-helper/",
        })
        .catch((error) => {
          console.error("서비스 워커 등록 실패:", error);
        });
    }
  }, []);

  return null;
}
