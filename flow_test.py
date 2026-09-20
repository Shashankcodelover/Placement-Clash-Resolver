from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        
        print("Navigating to app...")
        page.goto("http://127.0.0.1:8082/")
        page.wait_for_load_state("networkidle")
        
        # Take home screenshot
        page.screenshot(path="C:/Users/Preetham.j/.gemini/antigravity/brain/c95f737b-481b-4921-aabf-dc774f62b939/placement_home_verified.png", full_page=True)
        
        # Click the new mega feature tab
        print("Clicking Omniscient Mesh tab...")
        page.locator("button:has-text('👁️ Omniscient Recruiter Mesh')").click()
        time.sleep(1)
        
        # Click the initiate button
        print("Initiating mesh...")
        page.locator("button:has-text('👁️ Initiate Omni-Scrape & Render')").click()
        time.sleep(1)
        
        # Take feature screenshot
        page.screenshot(path="C:/Users/Preetham.j/.gemini/antigravity/brain/c95f737b-481b-4921-aabf-dc774f62b939/placement_mesh_verified.png", full_page=True)
        
        print("Test complete.")
        browser.close()

if __name__ == "__main__":
    run()
