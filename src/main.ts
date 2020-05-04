import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
} else {
  // make rxjs-spy library available in dev tools
  // for more information see: https://github.com/cartant/rxjs-spy
  import('rxjs-spy').then(rxjsSpy => {
    console.log('[rxjsSpy] Added to window. To enable logging of tagged observables, at the console window type: `rxjsSpy.create(); spy.log()`');
    console.log('[rxjsSpy] For more information see: https://github.com/cartant/rxjs-spy');
    Object.assign(window, { rxjsSpy });
  });
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
