{ pkgs ? import <nixpkgs> {} }: pkgs.mkShell {
  packages = with pkgs; [
    nodejs_21
    nodePackages.npm
  ];
}