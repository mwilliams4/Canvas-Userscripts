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

    if (document.readyState !== 'loading') {
        addAdminButton();
    } else {
        document.addEventListener('DOMContentLoaded', addAdminButton)
    }

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
            div1.appendChild(svg);
            const div2 = document.createElement('div');
            div2.classList.add('menu-item__text');
            div2.appendChild(document.createTextNode('Fast Admin'));
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