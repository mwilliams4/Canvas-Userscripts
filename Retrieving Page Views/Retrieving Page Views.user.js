// ==UserScript==
// @name         Export Page Views for User
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Exports the Page Views for a User to CSV
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/accounts/*/users/*
// @include      https://newcastle.test.instructure.com/accounts/*/users/*
// @include      https://newcastle.beta.instructure.com/accounts/*/users/*
// @include      https://canvas.newcastle.edu.au/users/*
// @include      https://newcastle.test.instructure.com/users/*
// @include      https://newcastle.beta.instructure.com/users/*
// ==/UserScript==

(function () {
  'use strict';

  const uniqueLinkId = 'mw_pageviews_csv';
  const userId = getUserId();
  const fileName = 'pageviews.csv'

  function addExportButton() {
    var parent;
    if (document.getElementById(uniqueLinkId)) return;
    parent = document.querySelector('#pageviews > div > span > span.fOyUs_bGBk.fOyUs_fhgP.fOyUs_divt.dJCgj_bGBk.dJCgj_dfFp > span');
    const insBefore = document.querySelector('#pageviews > div > span > span.fOyUs_bGBk.fOyUs_fhgP.fOyUs_divt.dJCgj_bGBk.dJCgj_dfFp > span > span:nth-child(2)');
    console.log('hi', parent)
    if (!parent) return;
    const span = document.createElement('span');
    span.style.marginLeft = '5px';
    const anchor = document.createElement('a');
    anchor.setAttribute('margin-right', '0');
    anchor.setAttribute('tabindex', '-1');
    anchor.classList.add('btn');
    anchor.id = uniqueLinkId;
    anchor.addEventListener('click', () => {
      openDialog();
    });
    const icon = document.createElement('i');
    icon.classList.add('icon-download');
    anchor.appendChild(icon);
    anchor.appendChild(document.createTextNode(' Page Views CSV in range...'));
    span.appendChild(anchor);
    insBefore.parentNode.insertBefore(span, insBefore);
    return;
  }

  async function processRequest() {
    const dates = checkDialog();
    const csvArr = [];


    
    const pageViews = await getPageViews(dates.dateFrom, dates.dateTo);

    if (pageViews.length === 0) {
      alert('No page views found.');
      return;
    }
    // debugger;

    const filteredPageViews = pageViews.map(pageView => {
      return {
        session_id: pageView.session_id,
        created_at: new Date(pageView.created_at).toString(),
        action: pageView.action,
        remote_ip: pageView.remote_ip,
        interaction_seconds: pageView.interaction_seconds,
        context_type: pageView.context_type,
        url: pageView.url,
        user_agent: pageView.user_agent,
        http_method: pageView.http_method,
        controller: pageView.controller,
        id: pageView.id,
      }
    });

    const headers = Object.keys(filteredPageViews[0]);
    csvArr.push(headers, ...filteredPageViews.map(pageView => Object.values(pageView)));

    exportToCsv(fileName, csvArr);
  }

  function createDialog() {
    var el = document.querySelector('#mw_pageviews_dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mw_pageviews_dialog';
      el.classList.add('ic-Form-control');
      var label = document.createElement('label');
      label.htmlFor = 'mw_pageviews_datefrom';
      label.textContent = 'Date From:';
      label.classList.add('ic-Label');
      el.appendChild(label);
      var input = document.createElement('input');
      input.id = 'mw_pageviews_datefrom';
      input.classList.add('ic-Input');
      input.type = 'text';
      input.placeholder = 'Enter start date for report, e.g. 2022-01-21';
      el.appendChild(input);
      label = document.createElement('label');
      label.htmlFor = 'mw_pageviews_dateto';
      label.textContent = 'Date To:';
      label.classList.add('ic-Label');
      el.appendChild(label);
      input = document.createElement('input');
      input.id = 'mw_pageviews_dateto';
      input.classList.add('ic-Input');
      input.type = 'text';
      input.placeholder = 'Enter end date for report, e.g. 2022-01-31';
      el.appendChild(input);
      var msg = document.createElement('div');
      msg.id = 'jj_rubric_msg';
      msg.classList.add('ic-flash-warning');
      msg.style.display = 'none';
      el.appendChild(msg);
      var parent = document.querySelector('body');
      parent.appendChild(el);
    }
  }

  function openDialog() {
    try {
      createDialog();

      $('#mw_pageviews_dialog').dialog({
        'title': 'Export Page Views CSV in date range...',
        'autoOpen': false,
        'buttons': [{
          'text': 'Cancel',
          'click': closeDialog,
        }, {
          'text': 'Export',
          'click': processRequest,
          'class': 'Button Button--primary',
        }],
        'modal': true,
        'height': 'auto',
        'width': '40%',
      });
      if (!$('#mw_pageviews_dialog').dialog('isOpen')) {
        $('#mw_pageviews_dialog').dialog('open');
      }
    } catch (e) {
      console.log(e);
    }
  }

  function checkDialog() {
    var dateFrom = new Date(document.getElementById('mw_pageviews_datefrom').value.trim());
    var dateTo = new Date(document.getElementById('mw_pageviews_dateto').value.trim());
    dateFrom.setHours(0);
    dateTo.setHours(0);
    // dateTo.setDate(dateTo.getDate() + 1)
    var todayDate = new Date();

    if (!dateFrom.valueOf() || !dateTo.valueOf()) {
      alert('Invalid dates.');
      return;
    }

    if (dateFrom.getTime() > dateTo.getTime()) {
      alert('Date to must come after date from.');
      return;
    }

    if (todayDate.getTime() < dateFrom.getTime() || todayDate.getTime() < dateTo.getTime()) {
      alert('Dates must be in the past.');
      return;
    }

    return {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    }

  }

  function closeDialog() {
    $(this).dialog('close');
    var el = document.getElementById('mw_pageviews_datefrom');
    if (el) {
      el.value = '';
    }
  }

  async function getPageViews(dateFrom, dateTo) {
    var pageViews = [];
    var parsedLinkHeader;

    var url = `${window.location.origin}/api/v1/users/${userId}/page_views?start_time=${dateFrom}&end_time=${dateTo}&per_page=100`

    var settings = {
      headers: {
        "X-CSRFToken": getCsrfToken()
      },
    }

    console.log(`Fetching page views.`);

    var i = 1;
    while (url !== null) {
      const response = await fetch(url, settings)

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      pageViews = [...pageViews, ...data];

      parsedLinkHeader = parseLinkHeader(response.headers.get('link'));

      if (parsedLinkHeader && parsedLinkHeader.next) {
        url = parsedLinkHeader.next;
      }
      else {
        url = null;
      }
      console.log(`Fetched from page ${i}. Length: ${pageViews.length}.`);
      i++;
    }
    return pageViews;
  }

  function parseLinkHeader(header) {
    if (header.length == 0) {
      throw new Error("input must not be of zero length");
    }

    // Split parts by comma
    var parts = header.split(',');
    var links = {};
    // Parse each part into a named link
    parts.forEach(p => {
      var section = p.split(';');
      if (section.length != 2) {
        throw new Error("section could not be split on ';'");
      }
      var url = section[0].replace(/<(.*)>/, '$1').trim();
      var name = section[1].replace(/rel="(.*)"/, '$1').trim();
      links[name] = url;
    });

    return links;
  }

  function getCsrfToken() {
    var csrfRegex = new RegExp('^_csrf_token=(.*)$');
    var csrf;
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      var match = csrfRegex.exec(cookie);
      if (match) {
        csrf = decodeURIComponent(match[1]);
        break;
      }
    }
    return csrf;
  }

  function getUserId() {
    let id = false;
    const quizRegex = new RegExp('/users/([0-9]+)');
    const matches = quizRegex.exec(window.location.pathname);
    if (matches) {
      id = matches[1];
    }
    return id;
  }

  function exportToCsv(filename, rows) {
    var processRow = function (row) {
      var finalVal = '';
      for (var j = 0; j < row.length; j++) {
        var innerValue = row[j] === null ? '' : row[j].toString();
        if (row[j] instanceof Date) {
          innerValue = row[j].toLocaleString();
        };
        var result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0)
          result = '"' + result + '"';
        if (j > 0)
          finalVal += ',';
        finalVal += result;
      }
      return finalVal + '\n';
    };

    var csvFile = '';
    for (var i = 0; i < rows.length; i++) {
      csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      var link = document.createElement("a");
      if (link.download !== undefined) { // feature detection
        // Browsers that support HTML5 download attribute
        var url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        link.click();
      }
    }
  }

  if (document.readyState !== 'loading') {
    addExportButton('Export Quiz', 'icon-download');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      addExportButton('Export Quiz', 'icon-download');
    });
  }

})();