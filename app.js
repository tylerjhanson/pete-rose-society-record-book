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
  const franchiseById = new Map(data.franchises.map((franchise) => [franchise.id, franchise]));

  function displayName(fullName) {
    const franchise = data.franchises.find((item) => item.name === fullName);
    if (franchise) return { team: franchise.teamName, manager: franchise.manager };
    const parts = String(fullName).split(" / ");
    return { team: parts[0], manager: parts.slice(1).join(" / ") };
  }

  function badge(label, className = "") {
    return `<span class="badge ${className}">${escapeHtml(label)}</span>`;
  }

  function resultBadges(entry) {
    const values = [];
    if (entry.finish === "1st") values.push(badge("League champion", "badge-title"));
    else if (entry.finish === "2nd") values.push(badge("Runner-up", "badge-playoff"));
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
    const champion = displayName(meta.latestChampion);
    $("#latest-champion").textContent = champion.team;
    $("#latest-champion-manager").textContent = champion.manager;
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
          <span class="team-name">${escapeHtml(franchise.teamName)}</span>
          <span class="manager-name">${escapeHtml(franchise.manager)}${franchise.active ? "" : " · inactive"}</span>
        </td>
        <td class="num">${franchise.wins}</td>
        <td class="num">${franchise.losses}</td>
        <td class="num">${franchise.ties}</td>
        <td class="num"><strong>${formatPct(franchise.pct)}</strong></td>
        <td class="num">${franchise.championshipsCount}</td>
        <td class="num">${franchise.playoffAppearancesCount}</td>
      </tr>
    `).join("");
  }

  $$('[data-leader-filter]').forEach((button) => {
    button.addEventListener("click", () => {
      $$('[data-leader-filter]').forEach((item) => item.classList.toggle("is-active", item === button));
      renderLeaderTable(button.dataset.leaderFilter);
    });
  });

  function renderTimeline() {
    const items = [];
    data.seasons.forEach((season) => {
      if (season.year === 2022) {
        items.push(`
          <article class="timeline-card excluded">
            <strong>2020–2021</strong>
            <span>Roto seasons excluded</span>
          </article>
        `);
      }
      const champion = season.standings.find((entry) => entry.finish === "1st");
      const regular = season.standings.filter((entry) => entry.regularSeasonChampion);
      const championName = champion ? displayName(champion.team) : { team: "Not recorded", manager: "" };
      items.push(`
        <article class="timeline-card">
          <div class="timeline-year">${season.year}</div>
          <div class="timeline-title">${escapeHtml(championName.team)}</div>
          <div class="timeline-manager">${escapeHtml(championName.manager)}</div>
          <div class="timeline-detail">Regular season: ${regular.map((entry) => escapeHtml(displayName(entry.team).team)).join(" / ") || "Not recorded"}</div>
        </article>
      `);
    });
    $("#championship-timeline").innerHTML = items.join("");
  }

  const seasonSelect = $("#season-select");
  data.seasons.slice().reverse().forEach((season) => {
    const option = document.createElement("option");
    option.value = season.year;
    option.textContent = season.year;
    seasonSelect.append(option);
  });

  function summaryCard(label, entry, fallback = "Not recorded") {
    if (!entry) return `<article class="summary-card"><span class="summary-label">${label}</span><strong>${fallback}</strong></article>`;
    const name = displayName(entry.team);
    return `
      <article class="summary-card">
        <span class="summary-label">${escapeHtml(label)}</span>
        <strong>${escapeHtml(name.team)}</strong>
        <small>${escapeHtml(name.manager)}</small>
      </article>
    `;
  }

  function renderSeason(year) {
    const season = data.seasons.find((item) => item.year === Number(year)) || data.seasons.at(-1);
    seasonSelect.value = season.year;
    $("#selected-season-title").textContent = `${season.year} standings`;
    const champion = season.standings.find((entry) => entry.finish === "1st");
    const regularChampions = season.standings.filter((entry) => entry.regularSeasonChampion);
    const toilet = season.standings.find((entry) => entry.toiletBowlChampion);
    const regularSummary = regularChampions.length === 1
      ? summaryCard("Regular-season champion", regularChampions[0])
      : `<article class="summary-card"><span class="summary-label">Regular-season champions</span><strong>${regularChampions.map((entry) => escapeHtml(displayName(entry.team).team)).join(" / ")}</strong><small>Tied for the regular-season title</small></article>`;
    $("#season-summary").innerHTML = [
      summaryCard("League champion", champion),
      regularSummary,
      summaryCard("Toilet Bowl champion", toilet)
    ].join("");

    $("#season-table-body").innerHTML = season.standings.map((entry) => {
      const name = displayName(entry.team);
      const rowClass = entry.regularSeasonChampion ? "row-regular-champ" : entry.playoffBerth ? "row-playoff" : "";
      return `
        <tr class="${rowClass}">
          <td>${entry.rank}</td>
          <td class="team-cell">
            <span class="team-name">${escapeHtml(name.team)}</span>
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
  }

  seasonSelect.addEventListener("change", () => renderSeason(seasonSelect.value));

  let franchiseFilter = "all";
  const franchiseSearch = $("#franchise-search");

  function renderFranchises() {
    const query = franchiseSearch.value.trim().toLowerCase();
    const franchises = data.franchises
      .filter((franchise) => {
        const matchesStatus = franchiseFilter === "all" || (franchiseFilter === "active" ? franchise.active : !franchise.active);
        const matchesSearch = !query || franchise.name.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => Number(b.active) - Number(a.active) || byPct(a, b));

    $("#franchise-result-count").textContent = `${franchises.length} franchise${franchises.length === 1 ? "" : "s"}`;
    $("#franchise-grid").innerHTML = franchises.length ? franchises.map((franchise) => `
      <button class="franchise-card ${franchise.active ? "" : "inactive"}" type="button" data-franchise-id="${escapeHtml(franchise.id)}">
        <h3>${escapeHtml(franchise.teamName)}</h3>
        <p class="manager">${escapeHtml(franchise.manager)}${franchise.active ? "" : " · inactive"}</p>
        <div class="franchise-record">
          <strong>${franchise.wins}-${franchise.losses}-${franchise.ties}</strong>
          <span>${formatPct(franchise.pct)}</span>
        </div>
        <div class="franchise-meta">
          ${badge(`${franchise.championshipsCount} title${franchise.championshipsCount === 1 ? "" : "s"}`, franchise.championshipsCount ? "badge-title" : "")}
          ${badge(`${franchise.playoffAppearancesCount} playoff berth${franchise.playoffAppearancesCount === 1 ? "" : "s"}`)}
          ${badge(`${franchise.activeSeasons} season${franchise.activeSeasons === 1 ? "" : "s"}`)}
        </div>
      </button>
    `).join("") : `<div class="empty-state">No franchises match this search.</div>`;
  }

  franchiseSearch.addEventListener("input", renderFranchises);
  $$('[data-franchise-filter]').forEach((button) => {
    button.addEventListener("click", () => {
      franchiseFilter = button.dataset.franchiseFilter;
      $$('[data-franchise-filter]').forEach((item) => item.classList.toggle("is-active", item === button));
      renderFranchises();
    });
  });

  const dialog = $("#franchise-dialog");
  const dialogContent = $("#franchise-dialog-content");

  function openFranchise(franchise) {
    const yearly = franchise.seasons.slice().reverse();
    dialogContent.innerHTML = `
      <div class="dialog-inner">
        <div class="dialog-header">
          <p class="eyebrow">${franchise.active ? "Active franchise" : "Inactive franchise"}</p>
          <h2 class="dialog-title">${escapeHtml(franchise.teamName)}</h2>
          <p class="dialog-manager">${escapeHtml(franchise.manager)}</p>
        </div>
        <div class="dialog-stats">
          <div class="dialog-stat"><strong>${recordText(franchise)}</strong><span>All-time record</span></div>
          <div class="dialog-stat"><strong>${formatPct(franchise.pct)}</strong><span>Winning percentage</span></div>
          <div class="dialog-stat"><strong>${franchise.championshipsCount}</strong><span>League titles</span></div>
          <div class="dialog-stat"><strong>${franchise.playoffAppearancesCount}</strong><span>Playoff berths</span></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Year</th><th class="num">W</th><th class="num">L</th><th class="num">T</th><th class="num">Pct.</th><th>Result</th></tr>
            </thead>
            <tbody>
              ${yearly.map((entry) => `
                <tr>
                  <td><strong>${entry.year}</strong></td>
                  <td class="num">${entry.wins}</td>
                  <td class="num">${entry.losses}</td>
                  <td class="num">${entry.ties}</td>
                  <td class="num">${formatPct(entry.pct)}</td>
                  <td>${resultBadges(entry)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  $("#franchise-grid").addEventListener("click", (event) => {
    const card = event.target.closest("[data-franchise-id]");
    if (!card) return;
    const franchise = franchiseById.get(card.dataset.franchiseId);
    if (franchise) openFranchise(franchise);
  });

  $(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  let recordLimit = 50;
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
    const visible = records.slice(0, recordLimit);
    $("#record-result-count").textContent = `${records.length} result${records.length === 1 ? "" : "s"}`;
    $("#record-table-body").innerHTML = visible.map((record) => {
      const name = displayName(record.team);
      return `
        <tr>
          <td><strong>${record.rank}</strong></td>
          <td>${record.year}</td>
          <td class="team-cell">
            <span class="team-name">${escapeHtml(name.team)}</span>
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
    $("#show-more-records").hidden = visible.length >= records.length;
  }

  [recordSearch, recordStatus].forEach((control) => {
    control.addEventListener(control === recordSearch ? "input" : "change", () => {
      recordLimit = 50;
      renderRecords();
    });
  });

  $("#show-more-records").addEventListener("click", () => {
    recordLimit += 50;
    renderRecords();
  });

  setStaticSummary();
  renderLeaderTable();
  renderTimeline();
  renderSeason(data.meta.endYear);
  renderFranchises();
  renderRecords();

  const initialView = location.hash.replace("#", "");
  activateView(["overview", "seasons", "franchises", "records"].includes(initialView) ? initialView : "overview", false);
})();
