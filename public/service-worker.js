// Collect static assets
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/index.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    './assets/images/map.jpg',
    '/styles.css',
    '/db.js',
    '/manifest.webmanifest',
    'https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/bootswatch/4.3.1/materia/bootstrap.min.css'
];

// CACHE for static files
const CACHE_NAME = 'static-cache-v2';
// CACHE for Api Responses 
const DATA_CACHE_NAME = 'data-cache-v1';

// Installation Phase : We apply the Event Listener to the service worker itself, 
self.addEventListener("install", function(evt) {
    // The event fires when the Cache Version has changed. 
    evt.waitUntil(
        // Open 
        caches.open(CACHE_NAME).then(cache => {
        console.log("Your files were pre-cached successfully!");
        // and apply 
        return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});


// Activation Phase : When the new cache has been created
// The service worker should respond by deleting the previous cache 
self.addEventListener("activate", function(evt) {
    evt.waitUntil(
        // Read into the Object keys
        caches.keys().then(keyList => {
            // Promise.all allows the all of the promises to be resolved before it moves on, 
            return Promise.all(
                // Each key 
                keyList.map(key => {
                    if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                        console.log("Removing old cache data", key);
                        // Remove and delete 
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    // So then the new service-worker is able to claim their spots. 
    self.clients.claim();
});


// Listen In for Fetch calls made to the API
self.addEventListener("fetch", function(evt) {
    // cache successful requests to the ONLY The /API/
    if (evt.request.url.includes("/api/")) { 
        evt.respondWith(
    // Either remember the response, 
            caches.open(DATA_CACHE_NAME).then(cache => {
                // In the case that we memorize the response, we process it by dispatching the fetch call and passing along the request URL
                return fetch(evt.request)
                .then(response => {
                    // If the response was good, clone it and store it in the cache.
                    if (response.status === 200) {
                        // Modify the cache by putting the response we got back from the request url key
                        cache.put(evt.request.url, response.clone());
                    }
                    // And return the Response, IN ONLINE MODE
                    return response;
                })
                // If the fetch call fails, we know we are offline
                .catch(err => {
                    // Network request failed, so instead of updating, we use match to READ from it. 
                    return cache.match(evt.request); // WHere evt.request === call made to this api, are there any values in our previous cache that answered the call?
                });
  // Or serve the previous response value
            }).catch(err => console.log(err))
        );
        return;
    }
    // All above code performs only for the API. So how do we handle static assets?
    evt.respondWith(
        caches.match(evt.request).then(function(response) {
            return response || fetch(evt.request);
        })
    );
});
