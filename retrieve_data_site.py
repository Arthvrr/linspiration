import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

def scrape_small_site(start_url, output_dir="site_export", max_pages=15):
    os.makedirs(os.path.join(output_dir, "assets"), exist_ok=True)
    domain = urlparse(start_url).netloc
    visited = set()
    to_visit = [start_url]
    downloaded_imgs = set()
    all_content = []

    headers = {"User-Agent": "Mozilla/5.0"}

    while to_visit and len(visited) < max_pages:
        url = to_visit.pop(0)
        if url in visited:
            continue
        visited.add(url)

        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if "text/html" not in resp.headers.get("Content-Type", ""):
                continue
        except requests.RequestException as e:
            print(f"Erreur sur {url}: {e}")
            continue

        soup = BeautifulSoup(resp.text, "html.parser")
        print(f"[Page] {url}")

        # 1. Télécharger les images
        for img in soup.find_all("img", src=True):
            img_url = urljoin(url, img["src"])
            if img_url not in downloaded_imgs:
                downloaded_imgs.add(img_url)
                try:
                    img_data = requests.get(img_url, headers=headers, timeout=10).content
                    filename = os.path.basename(urlparse(img_url).path) or f"img_{len(downloaded_imgs)}.jpg"
                    filepath = os.path.join(output_dir, "assets", filename)
                    with open(filepath, "wb") as f:
                        f.write(img_data)
                except requests.RequestException:
                    pass

        # 2. Trouver les autres pages internes
        for a in soup.find_all("a", href=True):
            next_url = urljoin(url, a["href"]).split("#")[0]
            if urlparse(next_url).netloc == domain and next_url not in visited:
                to_visit.append(next_url)

        # 3. Extraire le texte propre pour l'IA
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        text = "\n".join(line.strip() for line in soup.get_text("\n").splitlines() if line.strip())
        all_content.append(f"# PAGE: {url}\n\n{text}\n\n---\n")

    with open(os.path.join(output_dir, "contenu_pour_ia.md"), "w", encoding="utf-8") as f:
        f.writelines(all_content)

    print(f"Terminé : {len(visited)} pages et {len(downloaded_imgs)} images récupérées dans '{output_dir}'.")

if __name__ == "__main__":
    scrape_small_site("https://www.linspiration.be")