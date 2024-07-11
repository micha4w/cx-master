{ pkgs ? import <nixpkgs> {} }: pkgs.mkShell {
  packages = with pkgs; [
    openssl
    openssl.dev
    cargo
    rustup
    pkg-config
  ];
}