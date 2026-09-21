(() => {
  "use strict";

  const data = window.LEAGUE_DATA;
  if (!data) {
    document.body.innerHTML = "<p style='padding:2rem'>League data could not be loaded.</p>";
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);

  const formatPct = (value) => Number(value).toFixed(3).replace(/^0/, "");
  const recordText = (entry) => `${entry.wins}-${entry.losses}-${entry.ties}`;
  const byPct = (a, b) => b.pct - a.pct || b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name);

  const knownFranchiseIds = new Set(data.franchises.map((franchise) => franchise.id));
  const supplementalGroups = new Map();
  data.singleSeasonRecords.forEach((record) => {
    if (knownFranchiseIds.has(record.teamId)) return;
    if (!supplementalGroups.has(record.teamId)) supplementalGroups.set(record.teamId, []);
    supplementalGroups.get(record.teamId).push(record);
  });
  const supplementalFranchises = [...supplementalGroups.entries()].map(([id, seasons]) => {
    const first = seasons[0];
    const wins = seasons.reduce((total, entry) => total + entry.wins, 0);
    const losses = seasons.reduce((total, entry) => total + entry.losses, 0);
    const ties = seasons.reduce((total, entry) => total + entry.ties, 0);
    const games = wins + losses + ties;
    const parts = String(first.team).split(" / ");
    return {
      id,
      name: first.team,
      teamName: parts[0],
      manager: parts.slice(1).join(" / ") || "Manager not recorded",
      active: seasons.some((entry) => entry.active),
      wins,
      losses,
      ties,
      pct: games ? (wins + ties * 0.5) / games : 0,
      championshipsCount: seasons.filter((entry) => entry.finish === "1st").length,
      regularSeasonChampionshipsCount: seasons.filter((entry) => entry.regularSeasonChampion).length,
      playoffAppearancesCount: seasons.filter((entry) => entry.playoffBerth).length,
      toiletBowlChampionshipsCount: seasons.filter((entry) => entry.toiletBowlChampion).length,
      activeSeasons: seasons.length,
      seasons
    };
  });
  const allTeamPages = [...data.franchises, ...supplementalFranchises];
  const franchiseById = new Map(allTeamPages.map((franchise) => [franchise.id, franchise]));
  const franchiseByName = new Map(allTeamPages.map((franchise) => [franchise.name, franchise]));

  function displayName(fullName) {
    const franchise = franchiseByName.get(fullName);
    if (franchise) return { team: franchise.teamName, manager: franchise.manager };
    const parts = String(fullName).split(" / ");
    return { team: parts[0], manager: parts.slice(1).join(" / ") };
  }

  function teamPageLink(fullName, className = "team-name") {
    const franchise = franchiseByName.get(fullName);
    const name = displayName(fullName);
    if (!franchise) return `<span class="${className}">${escapeHtml(name.team)}</span>`;
    return `<a class="${className} table-link" href="#team/${encodeURIComponent(franchise.id)}">${escapeHtml(name.team)}</a>`;
  }

  function badge(label, className = "") {
    return `<span class="badge ${className}">${escapeHtml(label)}</span>`;
  }

  function resultBadges(entry) {
    const values = [];
    if (entry.finish === "1st") values.push(badge("League champion", "badge-title"));
    else if (entry.finish === "2nd") values.push(badge("Second place", "badge-playoff"));
    else if (entry.finish === "3rd") values.push(badge("Third place", "badge-playoff"));
    if (entry.regularSeasonChampion) values.push(badge("Regular-season champion", "badge-title"));
    else if (entry.playoffBerth && !entry.finish) values.push(badge("Playoffs", "badge-playoff"));
    if (entry.toiletBowlChampion) values.push(badge("Toilet Bowl champion", "badge-toilet"));
    return values.join(" ") || "—";
  }


  function setStaticSummary() {
    const meta = data.meta;
    $("#season-range").textContent = `${meta.startYear}–${meta.endYear}`;
    $(".season-stamp small").textContent = `${meta.countedSeasons} counted seasons`;
    $("#counted-seasons").textContent = meta.countedSeasons;
    $("#franchise-count").textContent = meta.franchiseCount;
    $("#active-count").textContent = meta.activeFranchiseCount;
    $("#team-season-count").textContent = data.singleSeasonRecords.length;
  }

  function activateView(viewName, updateHash = true) {
    const target = document.getElementById(viewName) || document.getElementById("overview");
    $$(".view").forEach((view) => {
      const selected = view === target;
      view.hidden = !selected;
      view.classList.toggle("is-active", selected);
    });
    $$(".nav-button").forEach((button) => {
      const selected = button.dataset.view === target.id;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-current", selected ? "page" : "false");
    });
    if (updateHash) history.replaceState(null, "", `#${target.id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $$(".nav-button").forEach((button) => {
    button.addEventListener("click", () => activateView(button.dataset.view));
  });

  function renderLeaderTable(filter = "active") {
    const franchises = data.franchises
      .filter((franchise) => filter === "all" || franchise.active)
      .sort(byPct);
    $("#leader-table-body").innerHTML = franchises.map((franchise, index) => `
      <tr>
        <td>${index + 1}</td>
        <td class="team-cell">
          <a class="team-name table-link" href="#team/${encodeURIComponent(franchise.id)}">${escapeHtml(franchise.teamName)}</a>
          <span class="manager-name">${escapeHtml(franchise.manager)}${franchise.active ? "" : " · inactive"}</span>
        </td>
        <td class="num">${franchise.wins}</td>
        <td class="num">${franchise.losses}</td>
        <td class="num">${franchise.ties}</td>
        <td class="num"><strong>${formatPct(franchise.pct)}</strong></td>
        <td class="num">${franchise.championshipsCount}</td>
        <td class="num">${franchise.playoffAppearancesCount}</td>
        <td class="num">${franchise.activeSeasons}</td>
      </tr>
    `).join("");
  }

  $$('[data-leader-filter]').forEach((button) => {
    button.addEventListener("click", () => {
      $$('[data-leader-filter]').forEach((item) => item.classList.toggle("is-active", item === button));
      renderLeaderTable(button.dataset.leaderFilter);
    });
  });

  function compareSortValues(a, b) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
  }

  function updateSortHeaders(selector, key, direction) {
    $$(selector).forEach((button) => {
      const selected = button.dataset.champSort === key || button.dataset.franchiseSort === key;
      const th = button.closest("th");
      button.classList.toggle("is-sorted", selected);
      button.dataset.direction = selected ? (direction === "asc" ? "ascending" : "descending") : "";
      th.setAttribute("aria-sort", selected ? button.dataset.direction : "none");
    });
  }

  let championshipSort = { key: "yearSort", direction: "desc" };

  function renderChampionshipTable() {
    const rows = data.seasons.map((season) => {
      const champion = season.standings.find((entry) => entry.finish === "1st");
      const regular = season.standings.filter((entry) => entry.regularSeasonChampion);
      const championName = champion ? displayName(champion.team) : { team: "Not recorded", manager: "" };
      const regularNames = regular.map((entry) => displayName(entry.team).team).join(" / ") || "Not recorded";
      return {
        year: String(season.year),
        yearSort: season.year,
        champion: championName.team,
        championTeam: champion ? champion.team : "",
        regular: regularNames,
        regularTeams: regular.map((entry) => entry.team),
        excluded: false
      };
    });
    rows.push({
      year: "2020–2021",
      yearSort: 2020.5,
      champion: "Excluded roto seasons",
      regular: "Not counted",
      regularTeams: [],
      championTeam: "",
      excluded: true
    });
    const direction = championshipSort.direction === "asc" ? 1 : -1;
    rows.sort((a, b) =>
      compareSortValues(a[championshipSort.key], b[championshipSort.key]) * direction
      || compareSortValues(a.yearSort, b.yearSort) * -1
    );
    $("#championship-table-body").innerHTML = rows.map((row) => `
      <tr class="${row.excluded ? "excluded-row" : ""}">
        <td><strong>${escapeHtml(row.year)}</strong></td>
        <td class="team-cell">${row.excluded ? `<span class="team-name">${escapeHtml(row.champion)}</span>` : teamPageLink(row.championTeam)}</td>
        <td>${row.excluded ? escapeHtml(row.regular) : row.regularTeams.map((team) => teamPageLink(team, "inline-team-link")).join(" / ")}</td>
      </tr>
    `).join("");
    updateSortHeaders("[data-champ-sort]", championshipSort.key, championshipSort.direction);
  }

  $$("[data-champ-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.champSort;
      championshipSort = championshipSort.key === key
        ? { key, direction: championshipSort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "yearSort" ? "desc" : "asc" };
      renderChampionshipTable();
    });
  });

  function renderAllSeasons() {
    $("#all-seasons").innerHTML = data.seasons.slice().reverse().map((season) => {
      const champion = season.standings.find((entry) => entry.finish === "1st");
      const regularChampions = season.standings.filter((entry) => entry.regularSeasonChampion);
      const toilet = season.standings.find((entry) => entry.toiletBowlChampion);
      const championName = champion ? displayName(champion.team).team : "Not recorded";
      const regularNames = regularChampions.map((entry) => displayName(entry.team).team).join(" / ") || "Not recorded";
      const toiletName = toilet ? displayName(toilet.team).team : "Not recorded";

      const rows = season.standings.map((entry) => {
        const name = displayName(entry.team);
        const rowClass = entry.regularSeasonChampion ? "row-regular-champ" : entry.playoffBerth ? "row-playoff" : "";
        return `
          <tr class="${rowClass}">
            <td>${entry.rank}</td>
            <td class="team-cell">
              ${teamPageLink(entry.team)}
              <span class="manager-name">${escapeHtml(name.manager)}${entry.active ? "" : " · inactive"}</span>
            </td>
            <td class="num">${entry.wins}</td>
            <td class="num">${entry.losses}</td>
            <td class="num">${entry.ties}</td>
            <td class="num"><strong>${formatPct(entry.pct)}</strong></td>
            <td class="num">${escapeHtml(entry.gamesBack === "0" ? "—" : entry.gamesBack)}</td>
            <td>${resultBadges(entry)}</td>
          </tr>
        `;
      }).join("");

      return `
        <section class="panel season-panel" aria-labelledby="season-${season.year}-title">
          <div class="section-heading compact season-panel-heading">
            <div>
              <p class="eyebrow">Final results</p>
              <h3 id="season-${season.year}-title">${season.year} standings</h3>
            </div>
            <div class="season-highlights">
              <span><small>League champion</small><strong>${champion ? teamPageLink(champion.team, "inline-team-link") : escapeHtml(championName)}</strong></span>
              <span><small>Regular season</small><strong>${regularChampions.length ? regularChampions.map((entry) => teamPageLink(entry.team, "inline-team-link")).join(" / ") : escapeHtml(regularNames)}</strong></span>
              <span><small>Toilet Bowl</small><strong>${toilet ? teamPageLink(toilet.team, "inline-team-link") : escapeHtml(toiletName)}</strong></span>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Franchise</th>
                  <th scope="col" class="num">W</th>
                  <th scope="col" class="num">L</th>
                  <th scope="col" class="num">T</th>
                  <th scope="col" class="num">Pct.</th>
                  <th scope="col" class="num">GB</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      `;
    }).join("");
  }

  let franchiseFilter = "all";
  let franchiseSort = { key: "pct", direction: "desc" };
  const franchiseSearch = $("#franchise-search");

  function renderFranchises() {
    const query = franchiseSearch.value.trim().toLowerCase();
    const direction = franchiseSort.direction === "asc" ? 1 : -1;
    const franchises = data.franchises
      .filter((franchise) => {
        const matchesStatus = franchiseFilter === "all" || (franchiseFilter === "active" ? franchise.active : !franchise.active);
        const searchText = `${franchise.teamName} ${franchise.manager}`.toLowerCase();
        const matchesSearch = !query || searchText.includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) =>
        compareSortValues(a[franchiseSort.key], b[franchiseSort.key]) * direction
        || byPct(a, b)
      );

    $("#franchise-result-count").textContent = `${franchises.length} franchise${franchises.length === 1 ? "" : "s"}`;
    $("#franchise-table-body").innerHTML = franchises.length ? franchises.map((franchise, index) => `
      <tr class="${franchise.active ? "" : "franchise-row-inactive"}">
        <td>${index + 1}</td>
        <td class="team-cell">
          <a class="team-name table-link" href="#team/${encodeURIComponent(franchise.id)}">${escapeHtml(franchise.teamName)}</a>
          <span class="manager-name">${escapeHtml(franchise.manager)}${franchise.active ? "" : " · inactive"}</span>
        </td>
        <td class="num">${franchise.wins}</td>
        <td class="num">${franchise.losses}</td>
        <td class="num">${franchise.ties}</td>
        <td class="num"><strong>${formatPct(franchise.pct)}</strong></td>
        <td class="num">${franchise.championshipsCount}</td>
        <td class="num">${franchise.playoffAppearancesCount}</td>
        <td class="num">${franchise.activeSeasons}</td>
      </tr>
    `).join("") : '<tr><td colspan="9" class="empty-state">No franchises match this search.</td></tr>';
    updateSortHeaders("[data-franchise-sort]", franchiseSort.key, franchiseSort.direction);
  }

  franchiseSearch.addEventListener("input", renderFranchises);
  $$("[data-franchise-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      franchiseFilter = button.dataset.franchiseFilter;
      $$("[data-franchise-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderFranchises();
    });
  });

  $$("[data-franchise-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.franchiseSort;
      const numericKeys = ["wins", "losses", "ties", "pct", "championshipsCount", "playoffAppearancesCount", "activeSeasons"];
      franchiseSort = franchiseSort.key === key
        ? { key, direction: franchiseSort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: numericKeys.includes(key) ? "desc" : "asc" };
      renderFranchises();
    });
  });

  function renderTeamPage(franchise) {
    const yearly = franchise.seasons.slice().sort((a, b) => b.year - a.year);
    $("#team-page-content").innerHTML = `
      <div class="page-heading team-page-heading">
        <div>
          <p class="eyebrow">${franchise.active ? "Active franchise" : "Inactive franchise"}</p>
          <h2 id="team-page-title">${escapeHtml(franchise.teamName)}</h2>
          <p class="team-page-manager">${escapeHtml(franchise.manager)}</p>
        </div>
      </div>

      <div class="team-page-stats">
        <article class="stat-card"><span class="stat-value">${recordText(franchise)}</span><span class="stat-label">All-time record</span></article>
        <article class="stat-card"><span class="stat-value">${formatPct(franchise.pct)}</span><span class="stat-label">Winning percentage</span></article>
        <article class="stat-card"><span class="stat-value">${franchise.championshipsCount}</span><span class="stat-label">League titles</span></article>
        <article class="stat-card"><span class="stat-value">${franchise.playoffAppearancesCount}</span><span class="stat-label">Playoff berths</span></article>
      </div>

      <section class="panel" aria-label="${escapeHtml(franchise.teamName)} season results">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Season by season</p>
            <h3>Results history</h3>
          </div>
          <span class="result-count">${franchise.activeSeasons} season${franchise.activeSeasons === 1 ? "" : "s"}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col" class="num">Finish</th>
                <th scope="col" class="num">W</th>
                <th scope="col" class="num">L</th>
                <th scope="col" class="num">T</th>
                <th scope="col" class="num">Pct.</th>
                <th scope="col" class="num">GB</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              ${yearly.map((entry) => `
                <tr class="${entry.regularSeasonChampion ? "row-regular-champ" : entry.playoffBerth ? "row-playoff" : ""}">
                  <td><strong>${entry.year}</strong></td>
                  <td class="num">${entry.rank}</td>
                  <td class="num">${entry.wins}</td>
                  <td class="num">${entry.losses}</td>
                  <td class="num">${entry.ties}</td>
                  <td class="num"><strong>${formatPct(entry.pct)}</strong></td>
                  <td class="num">${escapeHtml(entry.gamesBack === "0" ? "—" : entry.gamesBack)}</td>
                  <td>${resultBadges(entry)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function routeFromHash() {
    const route = location.hash.replace(/^#/, "");
    if (route.startsWith("team/")) {
      const id = decodeURIComponent(route.slice(5));
      const franchise = franchiseById.get(id);
      if (franchise) {
        renderTeamPage(franchise);
        activateView("team", false);
        return;
      }
    }
    const view = ["overview", "seasons", "franchises", "records"].includes(route) ? route : "overview";
    activateView(view, false);
  }

  window.addEventListener("hashchange", routeFromHash);

  const recordSearch = $("#record-search");
  const recordStatus = $("#record-status-select");

  function getFilteredRecords() {
    const query = recordSearch.value.trim().toLowerCase();
    const status = recordStatus.value;
    return data.singleSeasonRecords.filter((record) => {
      const matchesStatus = status === "all" || (status === "active" ? record.active : !record.active);
      const matchesQuery = !query || record.team.toLowerCase().includes(query) || String(record.year).includes(query);
      return matchesStatus && matchesQuery;
    });
  }

  function renderRecords() {
    const records = getFilteredRecords();
    $("#record-result-count").textContent = `${records.length} result${records.length === 1 ? "" : "s"}`;
    $("#record-table-body").innerHTML = records.map((record) => {
      const name = displayName(record.team);
      return `
        <tr>
          <td><strong>${record.rank}</strong></td>
          <td>${record.year}</td>
          <td class="team-cell">
            ${teamPageLink(record.team)}
            <span class="manager-name">${escapeHtml(name.manager)}${record.active ? "" : " · inactive"}</span>
          </td>
          <td class="num">${record.wins}</td>
          <td class="num">${record.losses}</td>
          <td class="num">${record.ties}</td>
          <td class="num"><strong>${formatPct(record.pct)}</strong></td>
          <td>${resultBadges(record)}</td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8" class="empty-state">No records match this search.</td></tr>`;
  }

  [recordSearch, recordStatus].forEach((control) => {
    control.addEventListener(control === recordSearch ? "input" : "change", renderRecords);
  });

  setStaticSummary();
  renderLeaderTable();
  renderChampionshipTable();
  renderAllSeasons();
  renderFranchises();
  renderRecords();

  routeFromHash();
})();
