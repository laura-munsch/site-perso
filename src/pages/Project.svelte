<script>
    import createClient from "../lib/prismicClient";
    import * as prismicH from "@prismicio/helpers";
    import Loader from "../components/Loader.svelte";
    import { Link } from "svelte-routing";

    export let slug;

    const client = createClient();
    const prismicQuery = client.getByUID("projects", slug);
</script>

{#await prismicQuery}
    <Loader />
{:then project}
    <article class="ctn">
        <Link to="/" class="close">Accueil</Link>

        <div class="description">
            <h1>{prismicH.asText(project.data.title)}</h1>

            {#if project.tags}
                <ul class="tags">
                    {#each project.tags as tag}
                        <li class="tag">{tag}</li>
                    {/each}
                </ul>
            {/if}

            {@html prismicH.asHTML(project.data.description)}
        </div>

        <div class="slider">
            {#if project.data.slider}
                {#each project.data.slider as slide}
                    <img src={slide.image.url} alt={slide.image.alt} />
                {/each}
            {/if}
        </div>
    </article>
{:catch error}
    <pre>{error.message}</pre>
{/await}

<style type="text/scss">
    @import "../assets/styles/project.scss";
</style>
