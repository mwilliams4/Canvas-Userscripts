// ==UserScript==
// @name         Add Fast Admin Link to Global Nav Menu
// @namespace    mw784
// @version      1
// @license      MIT
// @description  A simple script to add a 'Fast Admin' link to the Global Navigation Menu
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/*
// @include      https://newcastle.test.instructure.com/*
// @include      https://newcastle.beta.instructure.com/*
// ==/UserScript==

(function () {
    'use strict';

    const accountId = 1;

    window.addEventListener('load', addAdminButton)

    function addAdminButton() {
        const admin = document.querySelector('div.ic-app-header__main-navigation > #menu > li:nth-child(2)');
        if (admin) {
            const list = document.createElement('li');
            list.classList.add('menu-item', 'ic-app-header__menu-list-item');
            const anchor = document.createElement('a');
            anchor.id = 'global_nav_admin_link_2';
            anchor.classList.add('ic-app-header__menu-list-link');
            anchor.setAttribute('href', `${window.location.origin}/accounts/${accountId}`)
            anchor.addEventListener('click', checkReload);
            const div1 = document.createElement('div');
            div1.classList.add('menu-item-icon-container');
            div1.setAttribute('aria-hidden', 'true');
            const svg = document.querySelector('#global_nav_accounts_link > div.menu-item-icon-container > svg').cloneNode(true);

            svg.setAttribute('viewBox', '0 0 1920 1920')
            const path = svg.querySelector('path');
            path.outerHTML = `<path d="M1694.176 1077.91c0 323.238-470.174 580.066-670.87 689.732-25.864 14.118-47.435 25.864-63.247 35.238-15.812-9.374-37.384-21.12-63.247-35.238-200.697-109.666-670.87-366.494-670.87-689.731V437.534L960.058 122.88l734.117 314.654v640.377ZM960.06 0 113 362.993v714.918c0 390.211 511.398 669.628 729.713 788.894 27.445 15.02 49.694 27.106 64.941 36.254v.113c16.15 9.713 34.221 14.57 52.405 14.57a100.79 100.79 0 0 0 52.405-14.683c15.247-9.148 37.496-21.233 64.94-36.254 218.316-119.266 729.714-398.683 729.714-788.894V362.993L960.058 0ZM604.69 868.563l-79.849 79.85 322.221 322.333 604.687-604.687-79.85-79.85-524.837 524.726L604.69 868.563Z" fill-rule="evenodd"/>`
            // path.outerHTML = '<path d="M855.281 308.99v522.256L0 309.524v1300.242l855.281-521.83V1610.3l1064.612-650.655L855.281 308.989Zm106.91 190.62 752.755 460.035-752.754 460.034V499.61Zm-855.28.32 748.37 456.507v6.308l-748.37 456.507V499.93Z" fill-rule="evenodd"/>'
            div1.appendChild(svg);
            const div2 = document.createElement('div');
            div2.appendChild(document.createTextNode('Fast Admin'));
            div2.classList.add('menu-item__text');
            anchor.appendChild(div1);
            anchor.appendChild(div2);
            list.appendChild(anchor);
            admin.parentNode.insertBefore(list, admin);
        }
    }

    function checkReload() {
        if (window.location.href.includes(`${window.location.origin}/accounts/${accountId}`)) window.location.reload(true);
    }

})();