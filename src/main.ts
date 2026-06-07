import { App } from './app';
import './style.css';

const appEl = document.getElementById('app');
if (appEl) {
  new App(appEl);
}
