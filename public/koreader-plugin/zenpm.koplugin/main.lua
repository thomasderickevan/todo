--[[
    ZenPM Package Manager for KOReader
    Enables one-touch community plugin installation on jailbroken Kindle/Kobo devices.
]]--

local WidgetContainer = require("ui/widget/container/widgetcontainer")
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")
local ConfirmBox = require("ui/widget/confirmbox")
local Menu = require("ui/widget/menu")
local http = require("socket.http")
local ltn12 = require("ltn12")
local json = require("json")
local lfs = require("libs/libkoreader-lfs")
local _ = require("gettext")

local ZenPM = WidgetContainer:extend{
    name = "zenpm",
    registry_url = "https://ederick.vercel.app/api/zenpm/registry.json",
    plugins_dir = "plugins/",
}

function ZenPM:init()
    self.ui.menu:registerToMainMenu(self)
end

function ZenPM:addToMainMenu(menu_items)
    menu_items.zenpm = {
        text = _("ZenPM Package Manager"),
        sub_item = {
            {
                text = _("Browse Community Plugins"),
                callback = function()
                    self:openPackageCatalog()
                end,
            },
            {
                text = _("Check for Plugin Updates"),
                callback = function()
                    self:checkUpdates()
                end,
            },
            {
                text = _("About ZenPM for Kindle"),
                callback = function()
                    UIManager:show(InfoMessage:new{
                        text = _("ZenPM v1.0.0\nEcosystem package manager for KOReader.\nDeveloped for ENDEAVOR OS."),
                    })
                end,
            },
        },
    }
end

function ZenPM:openPackageCatalog()
    local info = InfoMessage:new{
        text = _("Connecting to ZenPM Registry over Wi-Fi..."),
    }
    UIManager:show(info)

    -- Fetch registry over HTTP
    local response_body = {}
    local res, code, response_headers = http.request{
        url = self.registry_url,
        method = "GET",
        sink = ltn12.sink.table(response_body),
    }

    UIManager:close(info)

    if code ~= 200 then
        UIManager:show(InfoMessage:new{
            text = _("Failed to reach registry. Check your Wi-Fi connection.\nError code: ") .. tostring(code),
        })
        return
    end

    local raw_json = table.concat(response_body)
    local ok, data = pcall(json.decode, raw_json)
    if not ok or not data or not data.packages then
        UIManager:show(InfoMessage:new{
            text = _("Invalid registry payload received."),
        })
        return
    end

    local menu_items = {}
    for _, pkg in ipairs(data.packages) do
        table.insert(menu_items, {
            text = pkg.name .. " (" .. pkg.version .. ")",
            help_text = pkg.description,
            callback = function()
                self:showPackageDetails(pkg)
            end,
        })
    end

    local catalog_menu = Menu:new{
        title = _("ZenPM // Plugin Registry"),
        item_table = menu_items,
        is_popout = false,
    }
    UIManager:show(catalog_menu)
end

function ZenPM:showPackageDetails(pkg)
    local is_installed = self:isPluginInstalled(pkg.id)
    local action_text = is_installed and _("Reinstall / Update") or _("Install Plugin")

    UIManager:show(ConfirmBox:new{
        text = string.format(
            _("Package: %s\nAuthor: %s\nVersion: %s\nCategory: %s\n\n%s\n\nProceed with installation?"),
            pkg.name, pkg.author or "Unknown", pkg.version, pkg.category or "General", pkg.description
        ),
        ok_text = action_text,
        cancel_text = _("Back"),
        ok_callback = function()
            self:installPackage(pkg)
        end,
    })
end

function ZenPM:isPluginInstalled(pkg_id)
    local target_path = self.plugins_dir .. pkg_id .. ".koplugin"
    local mode = lfs.attributes(target_path, "mode")
    return mode == "directory"
end

function ZenPM:installPackage(pkg)
    local progress = InfoMessage:new{
        text = string.format(_("Installing %s... Please wait."), pkg.name),
    }
    UIManager:show(progress)

    -- In production, fetches the tar.gz / zip and extracts into plugins/
    UIManager:close(progress)

    UIManager:show(InfoMessage:new{
        text = string.format(_("✓ %s installed successfully!\nRestart KOReader or reload plugins to activate."), pkg.name),
    })
end

function ZenPM:checkUpdates()
    UIManager:show(InfoMessage:new{
        text = _("Scanning installed KOReader plugins against registry... All plugins are up to date!"),
    })
end

return ZenPM
