import asyncio
import json
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from diffgate.analyzer import LLMAnalyzer
from diffgate.commenter import GitHubCommenter
from diffgate.config import settings
from diffgate.diff_parser import DiffParser

cli = typer.Typer(name="diffgate")
_console = Console()


@cli.command()
def replay(
    repo: str = typer.Option(..., "--repo"),
    token: Optional[str] = typer.Option(None, "--token"),
    n: int = typer.Option(30, "--n"),
    output: Optional[str] = typer.Option(None, "--output"),
    min_score: int = typer.Option(50, "--min-score"),
):
    github_token = token or settings.github_token
    if not github_token:
        _console.print("[red]Error: GITHUB_TOKEN not set[/red]")
        raise typer.Exit(1)

    results = asyncio.run(_replay_async(repo, n, github_token, min_score))
    print_replay_report(results, repo, n)
    if output:
        Path(output).write_text(json.dumps(results, ensure_ascii=False, indent=2))


async def _replay_async(repo: str, n: int, token: str, min_score: int) -> list[dict]:
    commenter = GitHubCommenter(token=token)
    analyzer = LLMAnalyzer(
        base_url=settings.volcano_base_url,
        api_key=settings.volcano_api_key,
        model=settings.volcano_model,
    )
    results: list[dict] = []

    try:
        client = await commenter._get_client()
        try:
            response = await client.get(
                f"/repos/{repo}/pulls",
                params={
                    "state": "closed",
                    "sort": "updated",
                    "direction": "desc",
                    "per_page": min(n, 100),
                },
            )
            prs = response.json()[:n]
        except Exception as error:
            _console.print(f"[red]Failed to fetch PRs: {error}[/red]")
            return []
        finally:
            await client.aclose()

        for pr in prs:
            diff_text = await commenter.get_pr_diff(repo, pr["number"])
            files = DiffParser().parse(diff_text)
            stats = DiffParser().compute_stats(files)
            if not files:
                _console.print(f"  PR #{pr['number']}: [dim]empty diff[/dim]")
                continue

            result = await analyzer.analyze(
                pr.get("title", ""),
                pr.get("body", "") or "",
                files,
                stats,
            )
            flagged = result.minimal_edit_score < min_score
            results.append(
                {
                    "pr_number": pr["number"],
                    "title": pr.get("title", ""),
                    "url": pr.get("html_url", ""),
                    "score": result.minimal_edit_score,
                    "flagged": flagged,
                    "flag_count": len(result.over_edit_flags),
                    "flags": [{"flag": item.flag, "detail": item.detail} for item in result.over_edit_flags],
                    "keep": result.suggested_scope.keep,
                    "revert": result.suggested_scope.revert,
                    "files_changed": len(files),
                    "total_lines": stats["total_changed_lines"],
                }
            )
            flag_string = "[red]FLAGGED[/red]" if flagged else "[green]OK[/green]"
            _console.print(f"  PR #{pr['number']}: score={result.minimal_edit_score} {flag_string}")
    finally:
        await commenter.close()
        await analyzer.close()

    return results


def print_replay_report(
    results: list[dict],
    repo: str,
    n: int,
    console: Console | None = None,
):
    out = console or _console
    if not results:
        out.print("[yellow]No results to display.[/yellow]")
        return

    total = len(results)
    flagged = sum(1 for item in results if item["flagged"])
    avg_score = sum(item["score"] for item in results) / total

    out.print(
        Panel(
            f"[bold]Repo:[/bold] {repo}\n"
            f"[bold]Total:[/bold] {total} PRs\n"
            f"[bold]Flagged (score<50):[/bold] {flagged} ({100 * flagged / total:.1f}%)\n"
            f"[bold]Avg score:[/bold] {avg_score:.1f}",
            title="Summary",
        )
    )

    table = Table(title="PR Analysis")
    table.add_column("PR", style="cyan")
    table.add_column("Score", style="magenta")
    table.add_column("Flags", style="yellow")
    table.add_column("Files", style="green")
    for item in results[:20]:
        flag_string = ", ".join(flag["flag"] for flag in item["flags"]) if item["flags"] else "—"
        table.add_row(
            f"#{item['pr_number']}",
            str(item["score"]),
            flag_string,
            str(item["files_changed"]),
        )
    out.print(table)

    if total > 20:
        out.print(f"[dim]... and {total - 20} more PRs[/dim]")


@cli.command()
def serve(
    host: str = typer.Option("0.0.0.0"),
    port: int = typer.Option(8000),
):
    import uvicorn

    uvicorn.run("diffgate.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    cli()
