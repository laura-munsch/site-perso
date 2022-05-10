<script>
    import createClient from '../lib/prismicClient';
    import  * as prismicH from "@prismicio/helpers";
    import Loader from "../components/Loader.svelte";
    import { Link } from "svelte-routing";

    export let slug;
    
    const client = createClient();
    const prismicQuery = client.getByUID('projects', slug);
</script>

{#await prismicQuery}
   <Loader />
{:then project}

    <Link to="/">Accueil</Link>

    <h1>{ prismicH.asText(project.data.title) }</h1>

    {#if project.tags }
        <ul>
            {#each project.tags as tag}
                <li>{ tag }</li>
            {/each}
        </ul>
    {/if}

    {@html prismicH.asHTML(project.data.description) }

    {#if project.data.slider }
        {#each project.data.slider as slide}
            {@html prismicH.asHTML(slide.text) }

            <img src="{ slide.image.url }" alt="{ slide.image.alt }">
        {/each}
    {/if}

{:catch error}
    <pre>{error.message}</pre>
{/await}