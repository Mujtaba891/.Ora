self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open("ora-cache").then((cache) => {
            return cache.addAll([
                "/",
                "/index.html",
                "/viewer.html",
                "/editor.html",
                "/script.js",
                "/style.css",
                "/manifest.json",
                "/app.js",
                "/editor.js",
                "/home.css",
                "/home.js",
                "/app.css"

            ]);
        })
    );
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Agar user manually app khole, toh index.html load ho
    if (url.origin === self.location.origin && url.pathname === "/") {
        event.respondWith(caches.match("/index.html"));
        return;
    }

    // Agar koi .Ora file open kare, toh viewer.html load ho
    if (url.searchParams.has("file") && url.pathname.endsWith(".Ora")) {
        event.respondWith(caches.match("/viewer.html"));
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
