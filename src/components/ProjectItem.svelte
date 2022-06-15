<script>
    import * as prismicH from "@prismicio/helpers";
    import { link } from "svelte-routing";
    import Loader from "./Loader.svelte";

    export let item;
    export let client;

    async function loadProject(slug) {
        const response = await client.getByUID("projects", slug);
        return response;
    }
</script>

{#if item.project.slug}
    {#await loadProject(item.project.slug)}
        <Loader />
    {:then project}
        <div class="container">
            <img
                src={project.data.image.url}
                alt={project.data.image.alt}
                class="image"
            />

            {#if project.data.direct_link.url}
                <a
                    href={project.data.direct_link.url}
                    class="link link--external"
                    use:link
                >
                    Voir le site
                </a>
            {/if}

            <a href={project.url} class="link link--internal" use:link>
                En savoir plus
            </a>
        </div>
    {/await}
{/if}

<style type="text/scss">
    @import "../assets/styles/project-item.scss";
</style>
