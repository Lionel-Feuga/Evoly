import { test, expect } from "@playwright/test";
for (const sex of ['Femme', 'Homme']) {
  test(`Repères bilatéraux et séance datée — ${sex}`, async ({page}) => {
    await page.goto('/');
    await page.getByRole('button',{name:sex,exact:true}).click();
    await page.getByLabel('Taille cm',{exact:true}).fill('175');
    await page.getByLabel('Bras',{exact:true}).check();
    await page.getByRole('button',{name:'Commencer mon carnet'}).click();
    await page.getByRole('button',{name:'Mes mesures'}).click();
    const date = page.getByLabel('Date des mesures');
    const sessionDate = await date.inputValue();
    const svg = page.locator('.silhouette-canvas > svg');
    const clickPoint = async (x:number,y:number) => {
      const box=await svg.boundingBox(); if(!box)throw Error('Silhouette absente');
      await svg.click({position:{x:box.width*x/300,y:box.height*y/430}});
    };
    for (const [zone,label,left,right,y,value] of [['arm','Bras',102,198,149,'32'],['thigh','Cuisse',131,169,284,'58']] as const) {
      await clickPoint(left,y);
      await page.getByRole('dialog').getByLabel(label,{exact:true}).fill(value);
      await page.getByRole('dialog').getByRole('button',{name:'Enregistrer',exact:true}).click();
      const marks=page.locator(`g[data-zone="${zone}"]`);
      await expect(marks).toHaveAttribute('data-completed','true');
      await expect(marks.locator('g[aria-hidden="true"]')).toHaveCount(2);
      await clickPoint(right,y);
      await expect(page.getByRole('dialog').getByLabel(label,{exact:true})).toHaveValue(value);
      await page.getByRole('dialog').getByRole('button',{name:'Enregistrer',exact:true}).click();
      await expect(page.locator('.history-row')).toHaveCount(1);
    }
    await page.locator('.body-card').screenshot({path:`test-results/silhouette-${sex}.png`});
    await date.fill('2025-03-01');
    await expect(page.locator('g[data-completed="true"]')).toHaveCount(0);
    await clickPoint(198,149);
    await expect(page.getByRole('dialog').getByLabel('Date',{exact:true})).toHaveValue('2025-03-01');
    await expect(page.getByRole('dialog').getByLabel('Bras',{exact:true})).toHaveValue('');
    await page.getByRole('button',{name:'Fermer',exact:true}).click();
    await date.fill(sessionDate);
    await expect(page.locator('g[data-completed="true"]')).toHaveCount(2);
    await page.reload();
    await page.getByRole('button',{name:'Mes mesures'}).click();
    await expect(page.locator('g[data-completed="true"]')).toHaveCount(2);
    await clickPoint(198,149);
    page.once('dialog',d=>void d.accept());
    await page.getByRole('button',{name:'Supprimer cette entrée'}).click();
    await expect(page.locator('g[data-zone="arm"]')).toHaveAttribute('data-completed','false');
    await expect(page.locator('g[data-zone="thigh"]')).toHaveAttribute('data-completed','true');
  });
}
test("Carnet complet : saisies, photos, sauvegarde, restauration et hors connexion", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => void d.accept());
  await page.goto("/");
  await page.getByLabel("Votre prénom").fill("Camille");
  await page.getByLabel("Taille cm", { exact: true }).fill("170");
  await page.getByLabel("Objectif").fill("70");
  await page.getByLabel("Premier poids").fill("80");
  await page.getByRole("button", { name: "Commencer mon carnet" }).click();
  await expect(
    page.getByRole("heading", { name: "Bonjour, Camille." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/01-accueil-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Ajouter une pesée", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Poids", { exact: true })
    .fill("82");
  await page
    .getByRole("dialog")
    .getByLabel("Date", { exact: true })
    .fill("2025-01-01");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".weight-number")).toContainText("80,0");
  await page.getByRole("button", { name: "Mes mesures" }).click();
  await page
    .getByRole("button", { name: "Mesurer : Taille", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Taille", { exact: true })
    .fill("84");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await expect(page.locator(".metric-number")).toContainText("84,0");
  await page.screenshot({
    path: "test-results/02-mensurations-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "IMC", exact: true }).click();
  await expect(page.locator(".metric-number")).toContainText("27,7");
  await page.getByRole("button", { name: "Photos", exact: true }).click();
  for (const date of ["2025-01-01", "2025-02-01"]) {
    await page
      .getByRole("button", { name: "Ajouter une photo", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Importer une photo", { exact: true })
      .setInputFiles("public/ev-icon-512.png");
    await expect(page.locator(".photo-preview")).toBeVisible();
    await page.getByLabel("Date de la photo").fill(date);
    await page.getByRole("button", { name: "Enregistrer la photo" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await page.getByRole("button", { name: "Comparer", exact: true }).click();
  await expect(page.locator(".comparison img")).toHaveCount(2);
  await page.getByRole("button", { name: "Superposition" }).click();
  await expect(page.getByLabel("Position du comparateur")).toBeVisible();
  await page.getByRole("button", { name: "Masquer les photos" }).click();
  await expect(
    page.getByRole("heading", { name: "Photos masquées" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mon carnet", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarder tout" }).click();
  const download = await downloadPromise;
  await download.saveAs("test-results/backup.zip");
  await expect(page.getByRole("status")).toContainText("Sauvegarde préparée");
  await page
    .locator("input[type=file]")
    .setInputFiles("test-results/backup.zip");
  await expect(
    page.getByRole("heading", { name: "Bonjour, Camille." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Photos", exact: true }).click();
  await expect(page.locator(".photo-tile")).toHaveCount(2);
  await page.getByRole("button", { name: "Progression", exact: true }).click();
  await page.getByRole("button", { name: "Poids", exact: true }).click();
  await page.getByRole("button", { name: /1 janvier 2025/ }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Poids", { exact: true })
    .fill("81.5");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /1 janvier 2025/ }),
  ).toContainText("81,5");
  await page.getByRole("button", { name: /1 janvier 2025/ }).click();
  await page.getByRole("button", { name: "Supprimer cette entrée" }).click();
  await expect(
    page.getByRole("button", { name: /1 janvier 2025/ }),
  ).toHaveCount(0);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Bonjour, Camille." }),
  ).toBeVisible();
  await expect(page.getByText("Hors connexion", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Petit écran, silhouette masculine, repères tactiles et sauvegarde invalide", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByRole("button", { name: "Homme", exact: true }).click();
  await page.getByLabel("Taille cm", { exact: true }).fill("180");
  for (const zone of ["Poitrine", "Abdomen", "Bras"])
    await page.getByLabel(zone, { exact: true }).check();
  await page.screenshot({
    path: "test-results/03-premier-lancement.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Commencer mon carnet" }).click();
  await page.getByRole("button", { name: "Mes mesures" }).click();
  const body = page.getByRole("img", { name: /Silhouette masculine/ });
  const bounds = await body.boundingBox();
  if (!bounds) throw Error("Silhouette invisible");
  await body.click({
    position: { x: bounds.width * 0.5, y: (bounds.height * 177) / 430 },
  });
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Taille", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("button", { name: /Mesurer :/ })).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Mon carnet", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("invalid backup"),
    });
  await expect(page.getByRole("alert")).toContainText("Restauration annulée");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bonjour." })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/04-accueil-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
