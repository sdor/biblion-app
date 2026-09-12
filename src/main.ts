import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// In the Office taskpane WebView (Safari/WebKit), window.history.replaceState
// and pushState are null due to iframe sandbox restrictions. Angular's router
// calls these unconditionally, causing a TypeError on every navigation.
// Patch them to safe no-ops before Angular boots.
if (window.history) {
  if (typeof window.history.replaceState !== 'function') {
    (window.history as History).replaceState = () => {};
  }
  if (typeof window.history.pushState !== 'function') {
    (window.history as History).pushState = () => {};
  }
}

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    console.log('Biblion running inside Microsoft Word');
  } else {
    console.log('Biblion running in standalone web mode');
  }

  // Bootstrap Angular application after Office environment is ready
  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
});

