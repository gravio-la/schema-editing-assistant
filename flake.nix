{
  description = "Code editing assistant API";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};

    run-dev-redis = pkgs.writeShellScriptBin "run-dev-redis" ''
      mkdir -p ./redis
      exec ${pkgs.redis}/bin/redis-server \
        --port 6379 \
        --dir ./redis \
        --logfile "" \
        --daemonize no
    '';
  in {
    packages.${system} = {
      hello = pkgs.hello;
      default = pkgs.hello;
    };

    devShells.${system}.default = pkgs.mkShell {
      buildInputs = [
        pkgs.tmux
        pkgs.bun
        pkgs.redis
        run-dev-redis
      ];

      shellHook = ''
        echo ""
        echo "Development shell ready."
        echo ""
        echo "Available commands:"
        echo "  run-dev-redis   Start Redis on port 6379, data stored in ./redis/"
        echo ""
      '';
    };
  };
}
