const SCANDIT_SDK_CDN = 'https://cdn.jsdelivr.net/npm/scandit-sdk@5.x';

const scriptElement = document.createElement('script');
scriptElement.src = SCANDIT_SDK_CDN;

const afterElement = document.head.querySelector('#scandit-injector');

window.addEventListener('error', (event) => {
    event.stopImmediatePropagation();
    console.log('window.error', event.message);
});

document.head.insertBefore(scriptElement, afterElement.nextSibling);
