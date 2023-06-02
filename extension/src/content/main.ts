import script from 'url:../accesible/main.ts';

function reinjectScript(src) {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        if (script.src == src) {
            script.remove();
        }
    }
    const script = document.createElement("script");
    script.src = src;
    document.head.appendChild(script);
}

reinjectScript(script);