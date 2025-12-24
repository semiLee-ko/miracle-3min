import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
    appName: 'miracle-3min',
    brand: {
        displayName: '침착해3분',
        primaryColor: '#3a75ffff',
        icon: 'https://static.toss.im/appsintoss/10277/48924e04-4060-4571-97d2-a94c6165f86e.png',
        bridgeColorMode: 'basic',
    },
    web: {
        host: '0.0.0.0',
        port: 5173,
        commands: {
            dev: 'vite',
            build: 'vite build',
        },
    },
    permissions: [
        { name: 'photos', access: 'read' }
    ],
    webViewProps: {
        type: 'partner',
    },
    outdir: 'dist',
});
