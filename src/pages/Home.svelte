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

    <div class="scroll-ctn">
        <header>
            <h1>
                <span class="title">{prismicH.asText(home.data.title)}</span>
                <span class="titleBis">{prismicH.asText(home.data.titlebis)}</span>
            </h1>

            <h2>{prismicH.asText(home.data.subtitle)}</h2>
        </header>

        <main>
            {#each home.data.body as timelinePiece}
               <div class="project">
                    <p class="year">{prismicH.asText(timelinePiece.primary.year)}</p>
                    {@html prismicH.asHTML(timelinePiece.primary.title)}

                    {#each timelinePiece.items as item}
                        {#if item.project.slug}

                            {#await loadProject(item.project.slug)}
                                <Loader />
                            {:then project} 

                                <Link to="{ project.url }">
                                    <img src="{ project.data.image.url }" alt="{ project.data.image.alt }" class="img-project">
                                </Link>

                            {/await}

                        {/if}
                    {/each}
               </div>
            {/each}
        </main>
    </div>

{:catch error}
    <pre>{error.message}</pre>
{/await}

<style type="text/scss">
    @import "../styles/home.scss";
</style>