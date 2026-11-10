// Classic inline JavaScript: runs from the initial HTML even when the Next.js
// bundle cannot start. No polyfills, storage access, network calls or telemetry.
export const IOS_COMPATIBILITY_SCRIPT = `(function(){var m=/(?:CPU (?:iPhone )?OS|iPhone OS) (\\d+)[_.](\\d+)/.exec(navigator.userAgent);if(m&&(Number(m[1])<16||(Number(m[1])===16&&Number(m[2])<4))){document.documentElement.setAttribute('data-moc-old-ios','');}})();`;
