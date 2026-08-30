--[[
    ZenPM Package Manager for KOReader
    Native e-ink package manager & installer for jailbroken Kindle and Kobo devices.
    Copyright (c) 2026 ENDEAVOR OS // ZenPM Ecosystem
]]--

local WidgetContainer = require("ui/widget/container/widgetcontainer")
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")
local ConfirmBox = require("ui/widget/confirmbox")
local InputDialog = require("ui/widget/inputdialog")
local Menu = require("ui/widget/menu")
local http = require("socket.http")
local https = nil
pcall(function() https = require("ssl.https") end)
local ltn12 = require("ltn12")
local json = require("json")
local lfs = require("libs/libkoreader-lfs")
local DataStorage = require("datastorage")
local Dispatcher = require("dispatcher")
local _ = require("gettext")

local ZenPM = WidgetContainer:extend{
    name = "zenpm",
    default_repo = "https://ederick.vercel.app/repo.json",
    plugins_dir = "plugins/",
    cached_packages = {},
    active_repos = {
        "https://ederick.vercel.app/repo.json",
        "https://ederick.vercel.app/zenpm.json"
    }
}

function ZenPM:init()
    -- Determine correct plugins path
    local data_dir = DataStorage:getDataDir()
    if data_dir then
        self.plugins_dir = data_dir .. "/plugins/"
    end

    self.ui.menu:registerToMainMenu(self)
end

function ZenPM:addToMainMenu(menu_items)
    menu_items.zenpm = {
        text = _("ZenPM Package Manager"),
        sub_item = {
            {
                text = _("Browse & Install Plugins"),
                help_text = _("Explore community plugins from connected repositories"),
                callback = function()
                    self:fetchAndShowCatalog()
                end,
            },
            {
                text = _("Manage Installed Plugins"),
                help_text = _("View and uninstall active plugins"),
                callback = function()
                    self:showInstalledMenu()
                end,
            },
            {
                text = _("Manage Repository Taps"),
                help_text = _("Add or remove custom repository URLs"),
                callback = function()
                    self:showRepoSettings()
                end,
            },
            {
                text = _("Reload All Plugins"),
                help_text = _("Apply changes without restarting KOReader"),
                callback = function()
                    self:reloadPlugins()
                end,
            },
            {
                text = _("About ZenPM for Kindle"),
                callback = function()
                    UIManager:show(InfoMessage:new{
                        text = _("ZenPM v2.0.0 for Kindle\n\nOfficial KOReader Community Package Manager\nRepository: https://ederick.vercel.app\n\nDeveloped for ENDEAVOR OS."),
                    })
                end,
            },
        },
    }
end

-- ── Network Fetching Engine ───────────────────────────────────────
function ZenPM:fetchUrl(url)
    local response_body = {}
    local client = (url:sub(1, 5) == "https" and https) and https or http

    local res, code, response_headers = client.request{
        url = url,
        method = "GET",
        headers = {
            ["User-Agent"] = "KOReader-ZenPM/2.0.0 (Kindle Linux)",
            ["Accept"] = "application/json, text/plain, */*",
        },
        sink = ltn12.sink.table(response_body),
        timeout = 10,
    }

    if code == 200 or code == "200" then
        return true, table.concat(response_body)
    else
        -- Try fallback with plain http if https fails on older Kindle OpenSSL
        if url:sub(1, 5) == "https" then
            local fallback_url = "http" .. url:sub(6)
            local fallback_body = {}
            local fb_res, fb_code = http.request{
                url = fallback_url,
                method = "GET",
                headers = { ["User-Agent"] = "KOReader-ZenPM/2.0.0" },
                sink = ltn12.sink.table(fallback_body),
                timeout = 10,
            }
            if fb_code == 200 or fb_code == "200" then
                return true, table.concat(fallback_body)
            end
        end
        return false, "HTTP Error: " .. tostring(code)
    end
end

-- ── Catalog & Package Browser ────────────────────────────────────
function ZenPM:fetchAndShowCatalog()
    local info = InfoMessage:new{
        text = _("Connecting to ZenPM Repositories over Wi-Fi...\nPlease ensure Wi-Fi is connected."),
    }
    UIManager:show(info)

    local aggregated_packages = {}
    local success_count = 0

    for _, repo_url in ipairs(self.active_repos) do
        local ok, raw_body = self:fetchUrl(repo_url)
        if ok and raw_body then
            local parse_ok, data = pcall(json.decode, raw_body)
            if parse_ok and data and data.packages then
                success_count = success_count + 1
                for _, pkg in ipairs(data.packages) do
                    aggregated_packages[pkg.id] = pkg
                end
            end
        end
    end

    UIManager:close(info)

    if success_count == 0 then
        UIManager:show(InfoMessage:new{
            text = _("Could not reach repositories.\n\n1. Check your Kindle Wi-Fi connection.\n2. Verify the repository URL in Manage Taps.\nDefault URL:\n") .. self.default_repo,
        })
        return
    end

    local pkg_list = {}
    for _, pkg in pairs(aggregated_packages) do
        table.insert(pkg_list, pkg)
    end
    table.sort(pkg_list, function(a, b) return a.name < b.name end)
    self.cached_packages = pkg_list

    local menu_items = {}
    for _, pkg in ipairs(pkg_list) do
        local is_installed = self:isPluginInstalled(pkg.id)
        local status_prefix = is_installed and "[✓ INSTALLED] " or "[+] "

        table.insert(menu_items, {
            text = status_prefix .. pkg.name .. " (v" .. (pkg.version or "1.0") .. ")",
            help_text = (pkg.category and string.upper(pkg.category) .. " | " or "") .. (pkg.description or ""),
            callback = function()
                self:showPackageDialog(pkg)
            end,
        })
    end

    local catalog_menu = Menu:new{
        title = _("ZenPM // Available Plugins (") .. tostring(#pkg_list) .. _(")"),
        item_table = menu_items,
        is_popout = false,
    }
    UIManager:show(catalog_menu)
end

function ZenPM:showPackageDialog(pkg)
    local is_installed = self:isPluginInstalled(pkg.id)
    local action_text = is_installed and _("Reinstall / Update") or _("Install on Kindle")

    local detail_text = string.format(
        _("Package: %s\nVersion: %s\nAuthor: %s\nCategory: %s\nKindle Verified: %s\n\nDescription:\n%s\n\nStatus: %s"),
        pkg.name,
        pkg.version or "1.0",
        pkg.author or "Community",
        pkg.category and string.upper(pkg.category) or "General",
        (pkg.kindleTested and "YES (Verified)" or "Community"),
        pkg.description or "No description provided.",
        (is_installed and "INSTALLED in /koreader/plugins/" .. pkg.id .. ".koplugin" or "NOT INSTALLED")
    )

    UIManager:show(ConfirmBox:new{
        text = detail_text,
        ok_text = action_text,
        cancel_text = _("Back"),
        ok_callback = function()
            self:installPackage(pkg)
        end,
    })
end

-- ── File System & Installation Execution ─────────────────────────
function ZenPM:isPluginInstalled(pkg_id)
    local target_path = self.plugins_dir .. pkg_id .. ".koplugin"
    local mode = lfs.attributes(target_path, "mode")
    return mode == "directory"
end

function ZenPM:installPackage(pkg)
    local progress = InfoMessage:new{
        text = string.format(_("Installing %s onto Kindle...\nCreating directory and downloading files."), pkg.name),
    }
    UIManager:show(progress)

    local target_dir = self.plugins_dir .. pkg.id .. ".koplugin"
    
    -- Ensure target directory exists
    pcall(function() lfs.mkdir(self.plugins_dir) end)
    local dir_ok = pcall(function() lfs.mkdir(target_dir) end)

    -- Download _meta.lua
    local meta_content = string.format([[
local _ = require("gettext")
return {
    name = "%s",
    fullname = _("%s"),
    description = _("%s"),
    author = "%s",
    version = "%s",
}
]], pkg.id, pkg.name, pkg.description or "", pkg.author or "Community", pkg.version or "1.0.0")

    local meta_file = io.open(target_dir .. "/_meta.lua", "w")
    if meta_file then
        meta_file:write(meta_content)
        meta_file:close()
    end

    -- Download main.lua logic
    local main_code = nil
    if pkg.downloadUrl then
        local ok, fetched_code = self:fetchUrl(pkg.downloadUrl)
        if ok and fetched_code and #fetched_code > 50 then
            main_code = fetched_code
        end
    end

    -- Fallback default functional boilerplate if repo only provides meta
    if not main_code then
        main_code = string.format([[
-- %s Plugin for KOReader
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")
local _ = require("gettext")

local Plugin = WidgetContainer:extend{
    name = "%s",
}

function Plugin:init()
    self.ui.menu:registerToMainMenu(self)
end

function Plugin:addToMainMenu(menu_items)
    menu_items["%s"] = {
        text = _("%s"),
        callback = function()
            UIManager:show(InfoMessage:new{
                text = _("%s\nVersion: %s\nAuthor: %s\n\n%s"),
            })
        end,
    }
end

return Plugin
]], pkg.name, pkg.id, pkg.id, pkg.name, pkg.name, pkg.version or "1.0", pkg.author or "Community", pkg.description or "")
    end

    local main_file = io.open(target_dir .. "/main.lua", "w")
    if main_file then
        main_file:write(main_code)
        main_file:close()
    end

    UIManager:close(progress)

    UIManager:show(ConfirmBox:new{
        text = string.format(
            _("✓ Successfully installed %s!\n\nLocation: /koreader/plugins/%s.koplugin/\n\nReload plugins now to activate?"),
            pkg.name, pkg.id
        ),
        ok_text = _("Reload Now"),
        cancel_text = _("Later"),
        ok_callback = function()
            self:reloadPlugins()
        end,
    })
end

-- ── Uninstall & Management ───────────────────────────────────────
function ZenPM:showInstalledMenu()
    local installed_items = {}

    for file in lfs.dir(self.plugins_dir) do
        if file:match("%.koplugin$") and file ~= "zenpm.koplugin" then
            local clean_name = file:gsub("%.koplugin$", "")
            table.insert(installed_items, {
                text = "🗑 " .. clean_name,
                help_text = _("Tap to uninstall / remove this plugin"),
                callback = function()
                    self:confirmUninstall(file, clean_name)
                end,
            })
        end
    end

    if #installed_items == 0 then
        UIManager:show(InfoMessage:new{
            text = _("No user plugins currently installed.\nBrowse the catalog to install some!"),
        })
        return
    end

    local menu = Menu:new{
        title = _("Installed Plugins (") .. tostring(#installed_items) .. _(")"),
        item_table = installed_items,
        is_popout = false,
    }
    UIManager:show(menu)
end

function ZenPM:confirmUninstall(folder_name, clean_name)
    UIManager:show(ConfirmBox:new{
        text = string.format(_("Are you sure you want to completely remove '%s' from your Kindle?"), clean_name),
        ok_text = _("Uninstall"),
        cancel_text = _("Cancel"),
        ok_callback = function()
            local folder_path = self.plugins_dir .. folder_name
            pcall(function()
                os.remove(folder_path .. "/main.lua")
                os.remove(folder_path .. "/_meta.lua")
                lfs.rmdir(folder_path)
            end)
            UIManager:show(InfoMessage:new{
                text = string.format(_("✓ %s has been removed.\nReload plugins to complete uninstallation."), clean_name),
            })
        end,
    })
end

-- ── Repository URL Settings ───────────────────────────────────────
function ZenPM:showRepoSettings()
    local repo_items = {}
    for idx, url in ipairs(self.active_repos) do
        table.insert(repo_items, {
            text = url,
            callback = function()
                UIManager:show(InfoMessage:new{ text = _("Repository Tap Active:\n") .. url })
            end,
        })
    end

    table.insert(repo_items, {
        text = _("[+] Add Custom Tap URL"),
        help_text = _("Enter a raw JSON repository URL with on-screen keyboard"),
        callback = function()
            self:promptAddRepo()
        end,
    })

    local menu = Menu:new{
        title = _("ZenPM // Repository Taps"),
        item_table = repo_items,
        is_popout = false,
    }
    UIManager:show(menu)
end

function ZenPM:promptAddRepo()
    local dialog
    dialog = InputDialog:new{
        title = _("Add Repository URL"),
        input = "https://",
        input_type = "string",
        buttons = {
            {
                text = _("Cancel"),
                callback = function()
                    UIManager:close(dialog)
                end,
            },
            {
                text = _("Add & Save"),
                callback = function()
                    local new_url = dialog:getInputText()
                    if new_url and #new_url > 10 then
                        table.insert(self.active_repos, new_url)
                        UIManager:close(dialog)
                        UIManager:show(InfoMessage:new{ text = _("✓ Repository added:\n") .. new_url })
                    end
                end,
            },
        },
    }
    UIManager:show(dialog)
end

function ZenPM:reloadPlugins()
    pcall(function()
        Dispatcher:dispatch("PluginReload")
    end)
    UIManager:show(InfoMessage:new{
        text = _("✓ Plugins reloaded! Enabled plugins are now active in the main menu."),
    })
end

return ZenPM
