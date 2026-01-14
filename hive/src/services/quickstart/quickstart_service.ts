/**
 * Quickstart Document Generation Service
 * Template-based SDK quickstart documentation generator
 *
 * Structure:
 * - docs/aden-sdk-documents/config/*.json - Configuration for vendors, languages, frameworks
 * - docs/aden-sdk-documents/templates/{language}/*.md - Complete template files
 */

import fs from "fs";
import path from "path";

// Base paths
const DOCS_BASE = path.join(__dirname, "../../../docs/aden-sdk-documents");
const CONFIG_PATH = path.join(DOCS_BASE, "config");
const TEMPLATES_PATH = path.join(DOCS_BASE, "templates");

interface VendorConfig {
  name: string;
  envVarComment?: string;
}

interface LanguageConfig {
  name: string;
}

interface FrameworkConfig {
  name: string;
  description: string;
  templateFile: string;
  pythonSupport: boolean;
  typescriptSupport: boolean;
}

interface ConfigCache {
  vendors: Record<string, VendorConfig>;
  languages: Record<string, LanguageConfig>;
  frameworks: Record<string, FrameworkConfig>;
}

// Cache for configs and templates
let configCache: ConfigCache | null = null;
let templateCache: Record<string, string> = {};

/**
 * Load all configuration files
 */
function loadConfigs(): ConfigCache {
  if (configCache) return configCache;

  configCache = {
    vendors: JSON.parse(
      fs.readFileSync(path.join(CONFIG_PATH, "llm-vendors.json"), "utf-8")
    ),
    languages: JSON.parse(
      fs.readFileSync(path.join(CONFIG_PATH, "sdk-languages.json"), "utf-8")
    ),
    frameworks: JSON.parse(
      fs.readFileSync(path.join(CONFIG_PATH, "agent-frameworks.json"), "utf-8")
    ),
  };

  return configCache;
}

/**
 * Load a template file
 */
function loadTemplate(language: string, templateName: string): string | null {
  const cacheKey = `${language}/${templateName}`;
  if (templateCache[cacheKey]) return templateCache[cacheKey];

  const templatePath = path.join(
    TEMPLATES_PATH,
    language,
    `${templateName}.md`
  );

  if (!fs.existsSync(templatePath)) {
    return null;
  }

  templateCache[cacheKey] = fs.readFileSync(templatePath, "utf-8");
  return templateCache[cacheKey];
}

/**
 * Clear caches (useful for development/testing)
 */
function clearCaches(): void {
  configCache = null;
  templateCache = {};
}

/**
 * Replace variables in template: {{variableName}}
 */
function replaceVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return variables[key] !== undefined ? variables[key] : "";
  });
}

interface GenerateQuickstartParams {
  llmVendor?: string;
  sdkLanguage?: string;
  agentFramework: string;
  apiKey: string;
}

/**
 * Generate quickstart document based on parameters
 */
function generateQuickstart({
  llmVendor = "openai",
  sdkLanguage = "python",
  agentFramework,
  apiKey,
}: GenerateQuickstartParams): string {
  const config = loadConfigs();

  // Validate inputs
  if (!config.vendors[llmVendor]) {
    throw new Error(
      `Invalid LLM vendor: ${llmVendor}. Valid options: ${Object.keys(
        config.vendors
      ).join(", ")}`
    );
  }
  if (!config.languages[sdkLanguage]) {
    throw new Error(
      `Invalid SDK language: ${sdkLanguage}. Valid options: ${Object.keys(
        config.languages
      ).join(", ")}`
    );
  }
  if (!config.frameworks[agentFramework]) {
    throw new Error(
      `Invalid agent framework: ${agentFramework}. Valid options: ${Object.keys(
        config.frameworks
      ).join(", ")}`
    );
  }
  if (!apiKey) {
    throw new Error("API key is required");
  }

  const vendor = config.vendors[llmVendor];
  const framework = config.frameworks[agentFramework];

  // Check language support
  if (sdkLanguage === "python" && !framework.pythonSupport) {
    throw new Error(`${framework.name} does not support Python`);
  }
  if (sdkLanguage !== "python" && !framework.typescriptSupport) {
    throw new Error(`${framework.name} does not support ${sdkLanguage}`);
  }

  // Load template
  const template = loadTemplate(sdkLanguage, framework.templateFile);

  if (!template) {
    throw new Error(
      `Template not found: ${sdkLanguage}/${framework.templateFile}`
    );
  }

  // Build variables
  const variables: Record<string, string> = {
    apiKey,
    serverUrl: process.env.HIVE_HOST || "https://hive.adenhq.com",
    envVarComment: vendor.envVarComment || "",
  };

  // Replace variables and return
  return replaceVariables(template, variables);
}

interface QuickstartOptions {
  llmVendors: Array<{ id: string; name: string }>;
  sdkLanguages: Array<{ id: string; name: string }>;
  agentFrameworks: Array<{
    id: string;
    name: string;
    description: string;
    pythonSupport: boolean;
    typescriptSupport: boolean;
  }>;
}

/**
 * Get available options for quickstart generation
 */
function getQuickstartOptions(): QuickstartOptions {
  const config = loadConfigs();

  return {
    llmVendors: Object.entries(config.vendors).map(([key, value]) => ({
      id: key,
      name: value.name,
    })),
    sdkLanguages: Object.entries(config.languages).map(([key, value]) => ({
      id: key,
      name: value.name,
    })),
    agentFrameworks: Object.entries(config.frameworks).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description,
      pythonSupport: value.pythonSupport,
      typescriptSupport: value.typescriptSupport,
    })),
  };
}

/**
 * Reload configs (useful after updating config files)
 */
function reloadConfigs(): ConfigCache {
  clearCaches();
  return loadConfigs();
}

export { generateQuickstart, getQuickstartOptions, reloadConfigs, clearCaches };
