// Bundled into the service worker by @ducanh2912/next-pwa (customWorkerSrc
// defaults to ./worker). Shows pushes from the keeper even when the app is
// fully closed, and opens the app when one is tapped.

declare const self: ServiceWorkerGlobalScope;

type PushPayload = { title: string; body?: string; tag?: string; url?: string };

self.addEventListener("push", (event) => {
  let data: PushPayload = { title: "Keep Yours" };
  try {
    data = event.data?.json() ?? data;
  } catch {
    data = { title: "Keep Yours", body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon-192.png",
      data: { url: data.url ?? "/app/home" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? "/app/home";
  event.waitUntil(
    (async () => {
      // Reuse an open window of the app if there is one.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).pathname.startsWith("/app"));
      if (open) {
        await open.focus();
        if ("navigate" in open) await (open as WindowClient).navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});

export {};
