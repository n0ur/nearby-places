{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  packages = [
    pkgs.postman
    pkgs.ffmpeg
  ];
  shellHook = ''
    PS0=""
    PS1="\[\033[1;32m\][nix-shell: \W]\$\[\033[0m\] "
  '';
}
