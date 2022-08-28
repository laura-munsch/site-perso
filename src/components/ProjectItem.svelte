<script>
    import * as prismicH from "@prismicio/helpers";
    import { link } from "svelte-routing";
    import Loader from "./Loader.svelte";
    import { asscroll } from "../stores";
    import IntersectionObserver from "./IntersectionObserver.svelte";

    export let item;
    export let client;

    async function loadProject(slug) {
        const response = await client.getByUID("projects", slug);
        then: {
            if ($asscroll) {
                $asscroll.resize();
            }
        }
        return response;
    }
</script>

{#if item.project.slug}
    {#await loadProject(item.project.slug)}
        <Loader />
    {:then project}
        {@const directLink = project.data.direct_link.url}
        <IntersectionObserver let:intersecting top={0}>
            <div class="container" class:invisible={!intersecting}>
                <img
                    src={project.data.image.url}
                    alt={project.data.image.alt}
                    class="image"
                />

                <a
                    href={project.url}
                    class="link link--internal {directLink ? '' : 'link--only'}"
                    use:link
                >
                    <span class="link-text link-text--internal">
                        en savoir plus
                    </span>
                </a>

                {#if directLink}
                    <a
                        href={directLink}
                        class="link link--external"
                        target="_blank"
                        use:link
                    >
                        <span class="link-text link-text--external">
                            accéder au site
                        </span>
                    </a>
                {/if}
            </div>
        </IntersectionObserver>
    {/await}
{/if}

<style type="text/scss">
    @import "../assets/styles/project-item.scss";
</style>
