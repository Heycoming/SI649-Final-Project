# SI649 Final Project

This repository contains the final project for SI649. It is generated from The Pudding's [Svelte Starter template](https://github.com/the-pudding/svelte-starter), which provides a robust foundation for building data-driven, visual stories using SvelteKit.


## Usage

### Installation
* In your local repo run `pnpm install` or `npm install`

### Local Review

```bash
npm run dev
```

### Deploy

If you want to deploy to Github Pages, please use :

```bash
npm run staging
```

For the other deployment options, check out the `Makefile` for specific tasks.

## Development

### Pages
The `src/routes` directory contains pages for your app. For a single-page app (most cases) you don't have to modify anything in here. `+page.svelte` represents the root page, think of it as the `index.html` file. Here, we mainly used it to load data. It also includes a reference to a blank slate component `src/components/Index.svelte`. This is the file we really start in for our app.

### Components

Located in `src/components`. We used `Scrolly.svelte` for Scrollytelling. We added our main contens in `Index.svelte`, `TreeMap.svelte`, and `SectorStream.svelte`. Moreover, we used `./layercaker/future/CirclePack.html.svelte` for Circle Packing visualization.
