const RAZORPAY_CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the Razorpay checkout.js SDK in the client browser.
 * Ensures singleton injection, prevents duplicate script tags, and handles retries gracefully.
 *
 * @returns Promise<boolean> resolving to true if Razorpay SDK is ready for instantiation, false otherwise.
 */
export function loadRazorpayScript(): Promise<boolean> {
  // 1. SSR Guard
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  // 2. Immediate resolution if Razorpay is already mounted on window
  if (typeof window.Razorpay === 'function') {
    return Promise.resolve(true);
  }

  // 3. Return existing in-flight promise to prevent concurrent duplicate script injections
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  // 4. Check if an existing script tag already exists in DOM
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`
  );

  if (existingScript) {
    if (typeof window.Razorpay === 'function') {
      return Promise.resolve(true);
    }

    scriptLoadingPromise = new Promise((resolve) => {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          scriptLoadingPromise = null;
          resolve(false);
        },
        { once: true }
      );
    });

    return scriptLoadingPromise;
  }

  // 5. Create and inject script tag into document body
  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      if (typeof window.Razorpay === 'function') {
        resolve(true);
      } else {
        console.error('[RazorpayLoader] Script loaded but window.Razorpay is undefined.');
        scriptLoadingPromise = null;
        resolve(false);
      }
    };

    script.onerror = (err) => {
      console.error('[RazorpayLoader] Failed to load Razorpay checkout script:', err);
      // Clean up failed script tag to allow clean retries
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      scriptLoadingPromise = null;
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}
