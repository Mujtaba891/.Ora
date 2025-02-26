if ('launchQueue' in window) {
    window.launchQueue.setConsumer((launchParams) => {
        if (!launchParams.files.length) {
            return;
        }
        
        for (const fileHandle of launchParams.files) {
            openOraFile(fileHandle);
        }
    });
}

