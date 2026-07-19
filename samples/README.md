# samples/capsium-demo

Source of the playground's sample package, shipped built at
`public/packages/capsium-demo-0.1.0.cap` and served by the "Try the sample
package" button on [/playground](https://www.capsium.org/playground/).

A tiny two-page dark-themed site plus one JSON dataset
(`/api/v1/data/demo`), designed to exercise the swsws service-worker
reactor: page routes, static assets, a dataset route, and the §7
introspection endpoints. `routes.json` and `manifest.json` are intentionally
absent — the packer auto-generates them per the §4 rules (index route,
dual HTML routes, per-asset routes, per-dataset routes).

## Rebuild

Requires the Capsium gem (built with 0.3.0):

```sh
gem install capsium
cd samples
capsium package pack capsium-demo --force
capsium package validate capsium-demo-0.1.0.cap   # must pass 6/6
cp capsium-demo-0.1.0.cap ../public/packages/
```

Contents are self-contained on purpose: the validator's content check
rejects external `src`/`href` references, so all assets are package-relative
and fonts are system stacks. All links/URLs in the pages are relative so the
package works under any service-worker scope prefix.
