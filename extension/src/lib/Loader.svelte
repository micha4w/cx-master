<div class="loader">
    <div />
    <div />
    <div />
</div>

<style>
    .loader {
        width: 100%;
        height: 80px;
        display: flex;
        justify-content: center;
        gap: 5px;
    }
    .loader div {
        width: 16px;
        height: 32px;
        background: #fff;
        /* animation: lds-facebook 1s cubic-bezier(0, 0.5, 0.5, 1) infinite; */
        animation: lds-facebook 2s ease-in-out infinite;
    }
    .loader div:nth-child(1) {
        animation-delay: -0.4s;
    }
    .loader div:nth-child(2) {
        animation-delay: -0.2s;
    }
    .loader div:nth-child(3) {
        animation-delay: 0;
    }
    @keyframes lds-facebook {
        0%,  100% {
            opacity: 0;
        }
        50% {
            opacity: 0.75;
        }
    }
</style>

