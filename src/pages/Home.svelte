<script>
    import createClient from '../lib/prismicClient';
    import  * as prismicH from "@prismicio/helpers";
    import Loader from "../components/Loader.svelte"
    import { Link } from "svelte-routing"
    
    const client = createClient();
    const prismicQuery = client.getSingle('home');
    
    async function loadProject(slug) {
        const response = await client.getByUID('projects', slug);
        return response;
    }
</script>

{#await prismicQuery}
    <Loader />
{:then home}

    <h1>
        <span>{prismicH.asText(home.data.title)}</span>
        <span>{prismicH.asText(home.data.titlebis)}</span>
    </h1>

    <h2>{home.data.subtitle}</h2>

    {#each home.data.body as timelinePiece}
        <p>{prismicH.asText(timelinePiece.primary.year)}</p>
        {@html prismicH.asHTML(timelinePiece.primary.title)}

        {#each timelinePiece.items as item}
            {#if item.project.slug}

                {#await loadProject(item.project.slug)}
                    <Loader />
                {:then project} 

                    <Link to="{ project.url }">
                        <img src="{ project.data.image.url }" alt="{ project.data.image.alt }">
                    </Link>

                {/await}

            {/if}
        {/each}
    {/each}

{:catch error}
    <pre>{error.message}</pre>
{/await}