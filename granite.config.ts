import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
    appName: 'miracle-3min',
    brand: {
        displayName: '3분의 기적',
        primaryColor: '#0f172a',
        icon: 'https://static.toss.im/appsintoss/10277/39de51d9-a6b3-4962-b8df-101a60153bad.png',
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
    outdir: 'dist',
});
