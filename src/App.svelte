<script context="module">
    import createClient from './lib/prismicClient';
    import  * as prismicH from "@prismicio/helpers";
    import Loader from "./components/Loader.svelte"
    
    const client = createClient(fetch);
    const prismicQuery = client.getFirst();
    const loadProject = (slug) => client.getByUID('projects', slug, 
        { fetchLinks: 'image' }
    )
</script>

{#await prismicQuery}
    <Loader />
{:then home}

    <h1>{prismicH.asText(home.data.title)}</h1>

    {#each home.data.body as timelinePiece}
        <p>{prismicH.asText(timelinePiece.primary.year)}</p>
        {@html prismicH.asHTML(timelinePiece.primary.title)}

        {#each timelinePiece.items as item}
            {#if item.project.slug}
                {#await loadProject(item.project.slug)}
                    <Loader />
                {:then project} 

                    <a href="{project.url}">
                        <img src="{project.data.image.url}" alt="{project.data.image.alt}" />
                    </a>

                {/await}
            {/if}
        {/each}
    {/each}

{:catch error}
    <pre>{error.message}</pre>
{/await}