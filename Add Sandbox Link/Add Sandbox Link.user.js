// ==UserScript==
// @name         Add Sandbox Link to Global Nav Menu
// @namespace    mw784
// @version      1
// @license      MIT
// @description  A simple script to add a 'Sandbox' link to the Global Navigation Menu
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/*
// @include      https://newcastle.test.instructure.com/*
// @include      https://newcastle.beta.instructure.com/*
// ==/UserScript==

(function () {
    'use strict';

    const sandboxId = 265; // UPDATE THIS TO YOUR OWN SANDBOX ID

    window.addEventListener('load', addButton)

    function addButton() {
        const courses = document.querySelector('#global_nav_courses_link').parentNode;
        if (courses) {
            const list = document.createElement('li');
            list.classList.add('menu-item', 'ic-app-header__menu-list-item');
            const anchor = document.createElement('a');
            anchor.id = 'global_nav_sandbox_link';
            anchor.classList.add('ic-app-header__menu-list-link');
            anchor.setAttribute('href', `${window.location.origin}/courses/${sandboxId}`)
            anchor.addEventListener('click', checkReload);
            const div1 = document.createElement('div');
            div1.classList.add('menu-item-icon-container');
            div1.setAttribute('aria-hidden', 'true');
            const svg = document.querySelector('#global_nav_accounts_link > div.menu-item-icon-container > svg').cloneNode(true);
            svg.setAttribute('viewBox', '0 0 1920 1920')
            const path = svg.querySelector('path')
            path.outerHTML = '<path d="m740.133 1272.387-4.266-4.693c-35.307-34.88-72.64-61.12-110.614-80.214 296-337.706 949.44-1005.76 1152.107-1013.973 6.613.32 13.653.32 22.507 9.173 3.306 3.307 3.413 11.734 3.306 16.32-7.893 200.214-676.906 856.107-1011.093 1150.294-14.187-25.28-31.147-50.774-51.947-76.907Zm-18.88 277.76c-53.76 119.787-301.866 176-463.36 196.587 26.24-66.987 53.76-168.534 53.76-299.2 0-71.68 50.88-146.987 118.4-175.254 19.734-8.213 40.32-12.266 61.227-12.266 54.72 0 112.32 27.733 167.36 81.28 66.027 83.946 87.147 154.133 62.613 208.853Zm-443.626-1369.6 102.72 102.72-137.92 138.027L138.96 317.827l138.667-137.28Zm1632.106 22.72c1.814-48.853-17.706-79.253-40.213-101.76-16.747-16.853-48.213-36.907-96.427-34.56C1548.667 76.12 1036.987 586.734 733.2 911.96L317.84 496.707 455.76 358.68 778 680.92l75.413-75.413L315.6 67.587c-20.693-20.693-54.187-20.8-75.307-.213L25.893 279.64C15.76 289.667 10 303.214 10 317.507c0 14.187 5.653 27.84 15.68 37.76l634.987 634.987c-69.76 75.946-121.92 134.613-147.947 164.373-41.92-3.52-83.733 2.56-123.733 19.2-108.374 45.227-184 157.76-184 273.707 0 208.213-80.427 330.133-80.96 331.093l-61.44 89.387 108.266-5.974c55.36-2.986 543.68-36.373 647.68-268.16 19.52-43.52 23.787-89.92 14.294-138.88 56.533-50.026 204.053-182.186 373.013-346.133l508.8 508.693v137.92h-137.92l-437.76-437.653-75.413 75.413 469.013 468.907h288.747V1573.4l-539.414-539.306c295.467-292.8 620.8-654.08 627.84-830.827Z" fill-rule="evenodd"></path>'
            div1.appendChild(svg);
            const div2 = document.createElement('div');
            div2.appendChild(document.createTextNode('Sandbox'));
            div2.classList.add('menu-item__text');
            anchor.appendChild(div1);
            anchor.appendChild(div2);
            list.appendChild(anchor);
            courses.parentNode.insertBefore(list, courses);
        }
    }

    function checkReload() {
        if (window.location.href.includes(`${window.location.origin}/accounts/${sandboxId}`)) window.location.reload(true);
    }

})();