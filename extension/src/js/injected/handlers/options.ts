export class OptionsHandler implements ISettingsHandler {
    observer : MutationObserver; 
    settings : Settings;

    onLoad(settings: Settings) {
        this.settings = settings;

        if (this.settings.options['fix_xterm_scrollbar'].value) {
            for (const _node of document.head.children) {
                const node = _node as HTMLElement;
                if (node?.style?.width == '50000px') {
                    node.style.width = '0px';
                }
            }
        }

        this.observer = new MutationObserver((recs) => {
            if (!this.settings.options['fix_xterm_scrollbar'].value)
                return;

            for (const rec of recs) {
                for (const _node of rec?.addedNodes) {
                    const node = _node as HTMLElement;
                    if (node?.style?.width == '50000px') {
                        node.style.width = '0px';
                    }
                }
            }
        });

        this.observer.observe(document.body, { childList: true });
    }

    onUpdate(settings: Settings) {
        this.settings = settings;
    }

    onUnload() {
        this.observer.disconnect();
    }
}
