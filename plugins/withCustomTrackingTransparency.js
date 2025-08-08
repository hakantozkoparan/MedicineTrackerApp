const path = require('path');
const fs = require('fs');

const withCustomTrackingTransparency = (config) => {
  return require('@expo/config-plugins').withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const localizationDir = path.join(config.modRequest.projectRoot, 'localization');
    
    if (fs.existsSync(localizationDir)) {
      const localizationFolders = fs.readdirSync(localizationDir).filter(folder => 
        folder.endsWith('.lproj') && fs.statSync(path.join(localizationDir, folder)).isDirectory()
      );
      
      localizationFolders.forEach(folder => {
        const sourcePath = path.join(localizationDir, folder);
        const targetPath = path.join(config.modRequest.platformProjectRoot, folder);
        
        // Copy localization files to iOS project
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
        
        const files = fs.readdirSync(sourcePath);
        files.forEach(file => {
          const sourceFile = path.join(sourcePath, file);
          const targetFile = path.join(targetPath, file);
          fs.copyFileSync(sourceFile, targetFile);
        });
        
        // Add to Xcode project
        const localizationGroup = xcodeProject.findPBXGroupKey({ name: folder });
        if (!localizationGroup) {
          const group = xcodeProject.addPbxGroup(files, folder, folder);
          xcodeProject.addToPbxGroup(group.uuid, xcodeProject.findPBXGroupKey({ name: 'Resources' }) || xcodeProject.getFirstProject().firstProject.mainGroup);
        }
      });
    }
    
    return config;
  });
};

module.exports = withCustomTrackingTransparency;
