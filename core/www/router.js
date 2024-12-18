"use strict";

import { showToastMessage, getUserName, getCookie, ConnectNotificationSocket , checkTokenExpired } from './code.js';

class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.params = null;
  }

  addRoute(path, component) {
    this.routes.push({ path, component });
  }

  async navigate(location, replace = false) {
    if (window.currentCleanup) {
      window.currentCleanup();
      window.currentCleanup = null;
    }

    const accessToken = getCookie('access_token');
    if (accessToken) {
      checkTokenExpired(accessToken);
    }

    const url = new URL(location, window.location.origin);
    let path = url.pathname;
    this.params = url.searchParams;

    const publicPaths = ['/', '/tfa', '/login', '/register'];

    if (accessToken) {
      const username = await getUserName();
      if (username) {
        await ConnectNotificationSocket();
      }
    }

    if (!publicPaths.includes(path)) {
      const header = document.querySelector('header');
      if (header) {
        header.classList.remove('d-none');
      }
    }

    if (!accessToken && !publicPaths.includes(path)) {
      showToastMessage('Bu sayfaya erişim yetkiniz bulunmamaktadır. Lütfen Giriş Yapınız!');
      path = '/';
    }
  
    else if (accessToken && !publicPaths.includes(path) && path !== '/personalize') {
      const username = await getUserName();
      if (username === null) {
        showToastMessage('Kullanıcı adı seçmelisiniz!');
        path = '/personalize';
      }
    }

    const foundRoute = this.routes.find(route => route.path === path);

    if (foundRoute) {
      this.currentRoute = foundRoute;
      await this.loadComponent();
      if (replace) {
        history.replaceState(null, '', path);
      } else {
        history.pushState(null, '', path);
      }
    } else {
      this.navigate('/404');
    }
  }

  async loadComponent() {
    const { component } = this.currentRoute;
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    if (main) {
      main.remove();
    }

    const existingLinks = document.querySelectorAll('link[data-router]');
    existingLinks.forEach(link => link.parentNode.removeChild(link));

    const existingScripts = document.querySelectorAll('script[data-router]');
    existingScripts.forEach(script => script.parentNode.removeChild(script));

    try {
      // HTML
      const response = await fetch(`pages/${component}/${component}.html`);
      const html = await response.text();
      header.insertAdjacentHTML('afterend', html);

      // CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `pages/${component}/${component}.css`;
      link.setAttribute('data-router', 'true');
      document.head.appendChild(link);

      // JavaScript
      const script = document.createElement('script');
      script.type = 'module';
      script.src = `pages/${component}/${component}.js`;
      script.setAttribute('data-router', 'true');
      script.addEventListener('load', () => {
        import(`./pages/${component}/${component}.js`).then(async module => {
          if (module.init && typeof module.init === 'function') {
            await module.init(this.params);
          }
        });
      });
      document.body.appendChild(script);
    } catch (error) {
      console.error(`Error loading component ${component}:`, error);
    }
  }
}

export default Router;