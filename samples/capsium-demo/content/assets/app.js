/* capsium-demo index page: fetch the package dataset and the reactor's
   introspection metadata, both served by the service worker. All URLs are
   relative so the page works under any mount prefix. */
(function () {
  'use strict';

  var status = document.getElementById('status');
  var base = document.getElementById('base');
  if (base) base.textContent = document.baseURI;

  function fail(message) {
    if (!status) return;
    status.textContent = message;
    status.classList.add('show');
  }

  function renderFacts(data) {
    var list = document.getElementById('facts');
    if (!list) return;
    list.textContent = '';
    var facts = data && Array.isArray(data.facts) ? data.facts : [];
    if (facts.length === 0) {
      var li = document.createElement('li');
      var strong = document.createElement('strong');
      strong.textContent = 'Dataset answered, but no facts inside';
      li.appendChild(strong);
      list.appendChild(li);
      return;
    }
    facts.forEach(function (fact) {
      var li = document.createElement('li');
      var strong = document.createElement('strong');
      strong.textContent = String(fact.title);
      var span = document.createElement('span');
      span.textContent = String(fact.detail);
      li.appendChild(strong);
      li.appendChild(span);
      list.appendChild(li);
    });
  }

  fetch('api/v1/data/demo', { headers: { Accept: 'application/json' } })
    .then(function (response) {
      if (!response.ok) throw new Error('dataset answered HTTP ' + response.status);
      return response.json();
    })
    .then(renderFacts)
    .catch(function (error) {
      fail('Could not load the demo dataset: ' + error.message);
    });

  var pre = document.getElementById('introspect');
  fetch('api/v1/introspect/metadata', { headers: { Accept: 'application/json' } })
    .then(function (response) {
      if (!response.ok) throw new Error('introspection answered HTTP ' + response.status);
      return response.json();
    })
    .then(function (data) {
      if (pre) pre.textContent = 'GET api/v1/introspect/metadata\n\n' + JSON.stringify(data, null, 2);
    })
    .catch(function (error) {
      if (pre) pre.textContent = 'introspection unavailable: ' + error.message;
    });
})();
